import type { Rule, FileEntry, RuleResult } from '../types.js';

const TARGET_EXTENSIONS = ['.js', '.ts', '.json', '.yaml', '.yml'];

const DEBUG_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /"debug"\s*:\s*true|debug:\s*true/g, label: 'debug: true' },
  { pattern: /NODE_ENV.*development|"NODE_ENV".*"development"/g, label: 'NODE_ENV set to development' },
  { pattern: /devMode\s*[:=]\s*true/g, label: 'devMode enabled' },
  { pattern: /verbose\s*[:=]\s*true/g, label: 'verbose enabled' },
  { pattern: /enableDebug\s*[:=]\s*true/g, label: 'enableDebug enabled' },
];

function hasTargetExtension(path: string): boolean {
  return TARGET_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export const debugConfigRule: Rule = {
  id: 'debug-config',
  defaultSeverity: 'warn',
  description: 'Detect debug/development configuration left in published packages',

  detect(file: FileEntry): RuleResult[] {
    const results: RuleResult[] = [];

    if (!hasTargetExtension(file.path)) return results;

    const text = file.content.toString('utf-8');

    for (const { pattern, label } of DEBUG_PATTERNS) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        results.push({
          ruleId: this.id,
          severity: this.defaultSeverity,
          message: `File "${file.path}" contains debug/development config: ${label}`,
          file: file.path,
          fix: `Remove or disable debug configuration before publishing. Use environment-based config to avoid shipping development settings`,
        });
      }
    }

    return results;
  },
};
