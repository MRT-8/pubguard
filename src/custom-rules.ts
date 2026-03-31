import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Rule } from './types.js';

const RULES_DIR = '.pubguard-rules';

/**
 * Validate that a loaded object has the required Rule shape.
 */
function isValidRule(obj: unknown): obj is Rule {
  if (obj == null || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.detect === 'function' &&
    (candidate.defaultSeverity === 'error' ||
      candidate.defaultSeverity === 'warn' ||
      candidate.defaultSeverity === 'info')
  );
}

/**
 * Load custom rule files from `<cwd>/.pubguard-rules/`.
 *
 * Each `.js` file should `export default` a Rule object with:
 *   - id: string
 *   - defaultSeverity: 'error' | 'warn' | 'info'
 *   - description: string
 *   - detect(file: FileEntry): RuleResult[]
 *
 * Returns an empty array if the directory does not exist.
 * Logs a warning to stderr for any file that fails to load or validate.
 */
export async function loadCustomRules(cwd: string): Promise<Rule[]> {
  const rulesDir = resolve(cwd, RULES_DIR);

  let entries: string[];
  try {
    const dirContents = await readdir(rulesDir);
    entries = dirContents.filter((f) => f.endsWith('.js'));
  } catch {
    // Directory doesn't exist or isn't readable — not an error
    return [];
  }

  const rules: Rule[] = [];

  for (const filename of entries) {
    const fullPath = join(rulesDir, filename);
    try {
      const fileUrl = pathToFileURL(fullPath).href;
      const mod = await import(fileUrl);
      const rule = mod.default ?? mod;

      if (!isValidRule(rule)) {
        process.stderr.write(
          `pubguard: custom rule "${filename}" is missing required fields (id, defaultSeverity, description, detect)\n`,
        );
        continue;
      }

      rules.push(rule);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`pubguard: failed to load custom rule "${filename}": ${message}\n`);
    }
  }

  return rules;
}
