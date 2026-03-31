import { describe, it, expect } from 'vitest';
import { analyze } from '../src/analyzer.js';
import type { FileEntry, PubguardConfig } from '../src/types.js';

const defaultConfig: PubguardConfig = {
  rules: {
    'sourcemap-leak': 'error',
    'sourcemap-reference': 'warn',
    'env-file': 'error',
    'private-key': 'error',
    'system-prompt': 'error',
  },
  ignore: [],
  thresholds: {},
};

function makeFile(path: string, content: string): FileEntry {
  return { path, size: Buffer.byteLength(content), content: Buffer.from(content) };
}

describe('analyzer', () => {
  it('returns passed=true for clean package', () => {
    const files = [
      makeFile('package/dist/index.js', 'module.exports = {}'),
      makeFile('package/package.json', '{"name":"test"}'),
    ];
    const report = analyze(files, defaultConfig);
    expect(report.passed).toBe(true);
    expect(report.results).toHaveLength(0);
    expect(report.totalFiles).toBe(2);
  });

  it('detects source map leak and fails', () => {
    const files = [
      makeFile('package/dist/cli.js.map', JSON.stringify({
        version: 3,
        sources: ['../src/index.ts'],
        sourcesContent: ['console.log("leaked")'],
        mappings: 'AAAA',
      })),
    ];
    const report = analyze(files, defaultConfig);
    expect(report.passed).toBe(false);
    expect(report.results.some(r => r.ruleId === 'sourcemap-leak')).toBe(true);
  });

  it('respects ignore patterns', () => {
    const config: PubguardConfig = {
      ...defaultConfig,
      ignore: ['dist/vendor/**'],
    };
    const files = [
      makeFile('package/dist/vendor/third-party.js.map', JSON.stringify({
        version: 3,
        sources: ['src/x.ts'],
        sourcesContent: ['x'],
        mappings: 'A',
      })),
    ];
    // The path in tarball is "package/dist/vendor/third-party.js.map"
    // ignore pattern is "dist/vendor/**"
    const report = analyze(files, config);
    expect(report.results).toHaveLength(0);
    expect(report.passed).toBe(true);
  });

  it('respects rule severity override from config', () => {
    const config: PubguardConfig = {
      ...defaultConfig,
      rules: { ...defaultConfig.rules, 'sourcemap-leak': 'warn' },
    };
    const files = [
      makeFile('package/dist/app.js.map', JSON.stringify({
        version: 3,
        sources: ['src/a.ts'],
        sourcesContent: ['leaked'],
        mappings: 'A',
      })),
    ];
    const report = analyze(files, config);
    expect(report.passed).toBe(true); // warn doesn't block
    expect(report.results[0].severity).toBe('warn');
  });

  it('respects "off" to disable rules', () => {
    const config: PubguardConfig = {
      ...defaultConfig,
      rules: { ...defaultConfig.rules, 'env-file': 'off' },
    };
    const files = [makeFile('package/.env', 'SECRET=abc')];
    const report = analyze(files, config);
    expect(report.results).toHaveLength(0);
  });

  it('checks package size threshold', () => {
    const config: PubguardConfig = {
      ...defaultConfig,
      thresholds: { 'max-package-size': '1KB' },
    };
    const files = [makeFile('package/big.js', 'x'.repeat(2048))];
    const report = analyze(files, config);
    expect(report.results.some(r => r.ruleId === 'threshold')).toBe(true);
  });

  it('detects multiple issues in one scan', () => {
    const files = [
      makeFile('package/.env', 'SECRET=abc'),
      makeFile('package/server.pem', 'cert data'),
      makeFile('package/dist/app.js', 'var x=1;\n//# sourceMappingURL=app.js.map'),
    ];
    const report = analyze(files, defaultConfig);
    expect(report.passed).toBe(false);
    expect(report.results.length).toBeGreaterThanOrEqual(3);
  });
});
