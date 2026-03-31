import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadCustomRules } from '../src/custom-rules.js';
import { join } from 'node:path';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('loadCustomRules', () => {
  it('returns empty array when rules directory does not exist', async () => {
    const nonexistent = join(tmpdir(), 'pubguard-test-no-dir-' + Date.now());
    const rules = await loadCustomRules(nonexistent);
    expect(rules).toEqual([]);
  });

  it('returns empty array when rules directory has no .js files', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'pubguard-test-'));
    const rulesDir = join(tempDir, '.pubguard-rules');
    await mkdir(rulesDir);
    await writeFile(join(rulesDir, 'readme.txt'), 'not a rule');

    try {
      const rules = await loadCustomRules(tempDir);
      expect(rules).toEqual([]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('logs warning to stderr for invalid rule files', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'pubguard-test-'));
    const rulesDir = join(tempDir, '.pubguard-rules');
    await mkdir(rulesDir);
    // Write a JS file that exports an object missing required fields
    await writeFile(
      join(rulesDir, 'bad-rule.js'),
      'export default { id: "bad" };',
    );

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      const rules = await loadCustomRules(tempDir);
      expect(rules).toEqual([]);
      expect(stderrSpy).toHaveBeenCalled();
      const output = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
      expect(output).toContain('bad-rule.js');
      expect(output).toContain('missing required fields');
    } finally {
      stderrSpy.mockRestore();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('loads a valid custom rule from .js file', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'pubguard-test-'));
    const rulesDir = join(tempDir, '.pubguard-rules');
    await mkdir(rulesDir);
    await writeFile(
      join(rulesDir, 'my-rule.js'),
      `export default {
        id: 'my-custom-rule',
        defaultSeverity: 'warn',
        description: 'A test custom rule',
        detect(file) { return []; },
      };`,
    );

    try {
      const rules = await loadCustomRules(tempDir);
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('my-custom-rule');
      expect(rules[0].defaultSeverity).toBe('warn');
      expect(rules[0].description).toBe('A test custom rule');
      expect(typeof rules[0].detect).toBe('function');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
