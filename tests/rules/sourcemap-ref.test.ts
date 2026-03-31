import { describe, it, expect } from 'vitest';
import { sourcemapRefRule } from '../../src/rules/sourcemap-ref.js';
import type { FileEntry } from '../../src/types.js';

function makeFile(path: string, content: string): FileEntry {
  return { path, size: Buffer.byteLength(content), content: Buffer.from(content) };
}

describe('sourcemap-reference rule', () => {
  it('detects sourceMappingURL in JS files', () => {
    const file = makeFile('package/dist/index.js',
      'var a=1;\n//# sourceMappingURL=index.js.map');
    const results = sourcemapRefRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe('sourcemap-reference');
    expect(results[0].message).toContain('index.js.map');
  });

  it('detects inline source maps (data URI)', () => {
    const file = makeFile('package/dist/app.js',
      'var b=2;\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ==');
    const results = sourcemapRefRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('inline source map');
  });

  it('detects external URL source maps', () => {
    const file = makeFile('package/dist/lib.js',
      'var c=3;\n//# sourceMappingURL=https://cdn.example.com/lib.js.map');
    const results = sourcemapRefRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('info');
  });

  it('detects CSS source map references', () => {
    const file = makeFile('package/dist/styles.css',
      '.a{color:red}\n/*# sourceMappingURL=styles.css.map */');
    const results = sourcemapRefRule.detect(file);
    expect(results).toHaveLength(1);
  });

  it('ignores files without sourceMappingURL', () => {
    const file = makeFile('package/dist/clean.js', 'var x=1;');
    const results = sourcemapRefRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('ignores non-JS/CSS files', () => {
    const file = makeFile('package/README.md',
      'Check //# sourceMappingURL=test.map for details');
    const results = sourcemapRefRule.detect(file);
    expect(results).toHaveLength(0);
  });
});
