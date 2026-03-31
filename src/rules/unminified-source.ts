import type { Rule, FileEntry, RuleResult } from '../types.js';

const JS_EXTENSIONS = ['.js', '.mjs', '.cjs'];
const MIN_SIZE = 50 * 1024; // 50 KB
const MIN_LINES = 500;
const MIN_AVG_LINE_LENGTH = 30;
const MIN_KEYWORD_COUNT = 10;

const KEYWORD_PATTERN = /\b(function|class|import|export|const|let|var|require|module\.exports)\b/g;

function isMinifiedFilename(path: string): boolean {
  const basename = path.split('/').pop() || '';
  return /\.min\.[cm]?js$/.test(basename);
}

function hasJsExtension(path: string): boolean {
  return JS_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export const unminifiedSourceRule: Rule = {
  id: 'unminified-source',
  defaultSeverity: 'warn',
  description: 'Detect unminified/unbundled source code that should not be in published packages',

  detect(file: FileEntry): RuleResult[] {
    const results: RuleResult[] = [];

    if (!hasJsExtension(file.path)) return results;
    if (file.size < MIN_SIZE) return results;
    if (isMinifiedFilename(file.path)) return results;

    const text = file.content.toString('utf-8');
    const lines = text.split('\n');
    const lineCount = lines.length;

    if (lineCount < MIN_LINES) return results;

    const totalChars = lines.reduce((sum, line) => sum + line.length, 0);
    const avgLineLength = totalChars / lineCount;

    if (avgLineLength < MIN_AVG_LINE_LENGTH) return results;

    const keywordMatches = text.match(KEYWORD_PATTERN);
    const keywordCount = keywordMatches ? keywordMatches.length : 0;

    if (keywordCount < MIN_KEYWORD_COUNT) return results;

    const sizeKB = (file.size / 1024).toFixed(0);
    results.push({
      ruleId: this.id,
      severity: this.defaultSeverity,
      message: `File "${file.path}" (${sizeKB} KB, ${lineCount} lines, avg ${avgLineLength.toFixed(0)} chars/line) appears to be unminified source code with ${keywordCount} JS keywords`,
      file: file.path,
      fix: `Minify the file before publishing, or exclude source files via .npmignore and only publish bundled/minified output`,
    });

    return results;
  },
};
