import type { Rule, FileEntry, RuleResult } from '../types.js';

export const sourcemapLeakRule: Rule = {
  id: 'sourcemap-leak',
  defaultSeverity: 'error',
  description: 'Detect .map files containing sourcesContent (full original source code)',

  detect(file: FileEntry): RuleResult[] {
    const results: RuleResult[] = [];

    if (!file.path.endsWith('.map')) return results;

    // Check if this is a JSON source map with sourcesContent
    const text = file.content.toString('utf-8', 0, Math.min(file.content.length, 1024 * 1024));

    const hasSourcesContent = text.includes('"sourcesContent"');
    const hasSources = text.includes('"sources"');
    const hasMappings = text.includes('"mappings"');

    if (hasSourcesContent && hasSources && hasMappings) {
      // This is a source map with embedded original source code
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      results.push({
        ruleId: this.id,
        severity: this.defaultSeverity,
        message: `Source map "${file.path}" (${sizeMB} MB) contains sourcesContent — full original source code is embedded and will be published`,
        file: file.path,
        fix: `Remove the .map file from your package by adding "*.map" to .npmignore, or configure your bundler to omit sourcesContent (e.g., Bun: remove --sourcemap flag for production builds)`,
      });
    } else if (hasSources && hasMappings && !hasSourcesContent) {
      // Source map without sourcesContent — lower risk but still exposes file structure
      results.push({
        ruleId: this.id,
        severity: 'warn',
        message: `Source map "${file.path}" exposes file paths via "sources" field (no sourcesContent, but file structure is visible)`,
        file: file.path,
        fix: `Consider removing .map files from published packages unless intentionally provided for debugging`,
      });
    }

    return results;
  },
};
