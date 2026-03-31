import type { Rule, FileEntry, RuleResult } from '../types.js';

const SOURCEMAP_URL_PATTERN = /\/\/[#@]\s*sourceMappingURL\s*=\s*(\S+)/;
const CSS_SOURCEMAP_URL_PATTERN = /\/\*[#@]\s*sourceMappingURL\s*=\s*(\S+)\s*\*\//;

export const sourcemapRefRule: Rule = {
  id: 'sourcemap-reference',
  defaultSeverity: 'warn',
  description: 'Detect sourceMappingURL references in JS/CSS files',

  detect(file: FileEntry): RuleResult[] {
    const results: RuleResult[] = [];

    const ext = file.path.split('.').pop()?.toLowerCase();
    if (!ext || !['js', 'mjs', 'cjs', 'css'].includes(ext)) return results;

    // Only check the last 512 bytes — sourceMappingURL is always at the end
    const tail = file.content.toString(
      'utf-8',
      Math.max(0, file.content.length - 512),
      file.content.length
    );

    const jsMatch = tail.match(SOURCEMAP_URL_PATTERN);
    const cssMatch = tail.match(CSS_SOURCEMAP_URL_PATTERN);
    const match = jsMatch || cssMatch;

    if (match) {
      const url = match[1];
      const isExternal = url.startsWith('http://') || url.startsWith('https://');
      const isDataUri = url.startsWith('data:');

      if (isDataUri) {
        results.push({
          ruleId: this.id,
          severity: this.defaultSeverity,
          message: `"${file.path}" contains an inline source map (data: URI) — original source code is embedded directly in the file`,
          file: file.path,
          fix: `Configure your bundler to disable inline source maps for production builds`,
        });
      } else if (isExternal) {
        results.push({
          ruleId: this.id,
          severity: 'info',
          message: `"${file.path}" references an external source map at "${url}"`,
          file: file.path,
          fix: `Verify that the external URL is not publicly accessible, or remove the reference for published packages`,
        });
      } else {
        results.push({
          ruleId: this.id,
          severity: this.defaultSeverity,
          message: `"${file.path}" references a local source map "${url}" — if this .map file is also in the package, source code will be exposed`,
          file: file.path,
          fix: `Remove the sourceMappingURL comment for production builds, or ensure the referenced .map file is excluded from the package`,
        });
      }
    }

    return results;
  },
};
