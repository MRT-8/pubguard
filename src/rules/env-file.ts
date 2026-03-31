import type { Rule, FileEntry, RuleResult } from '../types.js';

const ENV_FILE_PATTERNS = [
  /^\.env$/,
  /^\.env\..+$/,        // .env.local, .env.production, etc.
  /^\.env\.local$/,
  /^\.flaskenv$/,
  /^\.credentials$/,
  /^credentials\.json$/,
  /^service[-_]?account.*\.json$/i,
  /^\.netrc$/,
  /^\.npmrc$/,           // may contain auth tokens
  /^\.yarnrc$/,
  /^\.docker\/config\.json$/,
  /^\.aws\/credentials$/,
  /^\.ssh\//,
];

export const envFileRule: Rule = {
  id: 'env-file',
  defaultSeverity: 'error',
  description: 'Detect environment files and credential configs that should not be published',

  detect(file: FileEntry): RuleResult[] {
    const results: RuleResult[] = [];
    const basename = file.path.split('/').pop() || file.path;
    const relativePath = file.path.replace(/^package\//, '');

    for (const pattern of ENV_FILE_PATTERNS) {
      if (pattern.test(basename) || pattern.test(relativePath)) {
        results.push({
          ruleId: this.id,
          severity: this.defaultSeverity,
          message: `Sensitive file "${file.path}" detected — this file likely contains secrets or credentials`,
          file: file.path,
          fix: `Add "${basename}" to .npmignore, or use the "files" whitelist in package.json to exclude it`,
        });
        break;
      }
    }

    return results;
  },
};
