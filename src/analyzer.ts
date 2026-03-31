import type { FileEntry, PubguardConfig, RuleResult, ScanReport, Severity } from './types.js';
import { builtinRules } from './rules/index.js';

/**
 * Parse size strings like "10MB", "5KB" to bytes.
 */
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) return Infinity;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  return value * (multipliers[unit] ?? 1);
}

/**
 * Check if a file path matches any ignore pattern (simple glob support).
 */
function matchesIgnore(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      if (filePath.startsWith(prefix) || filePath.startsWith('package/' + prefix)) return true;
    } else if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      if (filePath.endsWith(suffix)) return true;
    } else if (filePath === pattern || filePath === 'package/' + pattern) {
      return true;
    }
  }
  return false;
}

export function analyze(files: FileEntry[], config: PubguardConfig): ScanReport {
  const results: RuleResult[] = [];
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Check package-level thresholds
  if (config.thresholds['max-package-size']) {
    const maxSize = parseSize(config.thresholds['max-package-size']);
    if (totalSize > maxSize) {
      results.push({
        ruleId: 'threshold',
        severity: 'warn',
        message: `Total package size (${(totalSize / 1024 / 1024).toFixed(1)} MB) exceeds threshold (${config.thresholds['max-package-size']})`,
        file: '<package>',
      });
    }
  }

  const maxFileSize = config.thresholds['max-file-size']
    ? parseSize(config.thresholds['max-file-size'])
    : Infinity;

  for (const file of files) {
    // Skip ignored files
    if (matchesIgnore(file.path, config.ignore)) continue;

    // Check per-file size threshold
    if (file.size > maxFileSize) {
      results.push({
        ruleId: 'threshold',
        severity: 'warn',
        message: `File "${file.path}" (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds threshold (${config.thresholds['max-file-size']})`,
        file: file.path,
      });
    }

    // Run all enabled rules
    for (const rule of builtinRules) {
      const configSeverity = config.rules[rule.id];
      if (configSeverity === 'off') continue;

      const ruleResults = rule.detect(file);
      for (const result of ruleResults) {
        // Override severity from config if specified
        if (configSeverity) {
          result.severity = configSeverity;
        }
        results.push(result);
      }
    }
  }

  const hasErrors = results.some((r) => r.severity === 'error');

  return {
    totalFiles: files.length,
    totalSize,
    results,
    passed: !hasErrors,
  };
}
