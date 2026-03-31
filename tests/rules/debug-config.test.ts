import { describe, it, expect } from 'vitest';
import { debugConfigRule } from '../../src/rules/debug-config.js';
import type { FileEntry } from '../../src/types.js';

function makeFile(path: string, content: string): FileEntry {
  return { path, size: Buffer.byteLength(content), content: Buffer.from(content) };
}

describe('debug-config rule', () => {
  it('detects "debug": true in JSON', () => {
    const content = '{ "debug": true, "port": 3000 }';
    const file = makeFile('package/config.json', content);
    const results = debugConfigRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe('debug-config');
    expect(results[0].severity).toBe('warn');
    expect(results[0].message).toContain('debug: true');
  });

  it('detects NODE_ENV development', () => {
    const content = 'process.env.NODE_ENV = "development";';
    const file = makeFile('package/dist/index.js', content);
    const results = debugConfigRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('NODE_ENV');
  });

  it('detects devMode = true', () => {
    const content = 'const devMode = true;\nexport default devMode;';
    const file = makeFile('package/src/config.ts', content);
    const results = debugConfigRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('devMode');
  });

  it('detects verbose: true in YAML', () => {
    const content = 'logging:\n  verbose: true\n  level: debug';
    const file = makeFile('package/config.yaml', content);
    const results = debugConfigRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('verbose');
  });

  it('detects enableDebug = true', () => {
    const content = 'const enableDebug = true;';
    const file = makeFile('package/dist/settings.js', content);
    const results = debugConfigRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('enableDebug');
  });

  it('reports multiple patterns in a single file', () => {
    const content = '{ "debug": true, "NODE_ENV": "development" }';
    const file = makeFile('package/config.json', content);
    const results = debugConfigRule.detect(file);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('ignores files without target extensions', () => {
    const content = '"debug": true';
    const file = makeFile('package/data/config.xml', content);
    const results = debugConfigRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('ignores files without debug patterns', () => {
    const content = '{ "name": "my-package", "version": "1.0.0" }';
    const file = makeFile('package/package.json', content);
    const results = debugConfigRule.detect(file);
    expect(results).toHaveLength(0);
  });
});
