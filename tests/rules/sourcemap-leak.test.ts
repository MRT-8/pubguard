import { describe, it, expect } from 'vitest';
import { sourcemapLeakRule } from '../../src/rules/sourcemap-leak.js';
import type { FileEntry } from '../../src/types.js';

function makeFile(path: string, content: string): FileEntry {
  return { path, size: Buffer.byteLength(content), content: Buffer.from(content) };
}

describe('sourcemap-leak rule', () => {
  it('detects .map file with sourcesContent', () => {
    const file = makeFile('package/dist/cli.js.map', JSON.stringify({
      version: 3,
      sources: ['../src/index.ts'],
      sourcesContent: ['console.log("hello")'],
      mappings: 'AAAA',
    }));
    const results = sourcemapLeakRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].ruleId).toBe('sourcemap-leak');
    expect(results[0].message).toContain('sourcesContent');
  });

  it('warns on .map file without sourcesContent', () => {
    const file = makeFile('package/dist/bundle.js.map', JSON.stringify({
      version: 3,
      sources: ['../src/app.ts', '../src/utils.ts'],
      mappings: 'AAAA;BBBB',
    }));
    const results = sourcemapLeakRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('warn');
  });

  it('ignores non-.map files', () => {
    const file = makeFile('package/dist/index.js', 'console.log("hello")');
    const results = sourcemapLeakRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('ignores non-sourcemap .map files', () => {
    const file = makeFile('package/data/translations.map', '{"en": "hello"}');
    const results = sourcemapLeakRule.detect(file);
    expect(results).toHaveLength(0);
  });
});
