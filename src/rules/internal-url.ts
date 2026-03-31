import type { Rule, FileEntry, RuleResult } from '../types.js';

const TARGET_EXTENSIONS = ['.js', '.ts', '.json', '.yaml', '.yml'];
const MIN_FILE_SIZE = 100; // bytes

const URL_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /https?:\/\/[^/\s"']*\.internal\.[^/\s"']*/g, label: 'internal domain' },
  { pattern: /https?:\/\/[^/\s"']*\.corp\.[^/\s"']*/g, label: 'corporate domain' },
  { pattern: /https?:\/\/localhost:\d+/g, label: 'localhost URL' },
  { pattern: /https?:\/\/127\.0\.0\.1:\d+/g, label: 'loopback URL' },
  { pattern: /https?:\/\/10\.\d+\.\d+\.\d+/g, label: 'private IP (10.x.x.x)' },
  { pattern: /https?:\/\/192\.168\.\d+\.\d+/g, label: 'private IP (192.168.x.x)' },
];

function hasTargetExtension(path: string): boolean {
  return TARGET_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export const internalUrlRule: Rule = {
  id: 'internal-url',
  defaultSeverity: 'warn',
  description: 'Detect internal/corporate URLs that should not be exposed in published packages',

  detect(file: FileEntry): RuleResult[] {
    const results: RuleResult[] = [];

    if (!hasTargetExtension(file.path)) return results;
    if (file.size < MIN_FILE_SIZE) return results;

    const text = file.content.toString('utf-8');

    for (const { pattern, label } of URL_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match) {
        results.push({
          ruleId: this.id,
          severity: this.defaultSeverity,
          message: `File "${file.path}" contains ${label}: ${match[0]}`,
          file: file.path,
          fix: `Remove or replace internal URLs before publishing. Use environment variables or configuration files for environment-specific URLs`,
        });
      }
    }

    return results;
  },
};
