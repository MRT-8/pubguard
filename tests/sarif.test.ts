import { describe, it, expect } from 'vitest';
import { formatSarif } from '../src/sarif.js';
import type { ScanReport } from '../src/types.js';

function makeReport(overrides: Partial<ScanReport> = {}): ScanReport {
  return {
    totalFiles: 0,
    totalSize: 0,
    results: [],
    passed: true,
    ...overrides,
  };
}

describe('formatSarif', () => {
  it('produces valid JSON output', () => {
    const report = makeReport();
    const output = formatSarif(report);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('empty report produces valid SARIF structure', () => {
    const report = makeReport();
    const sarif = JSON.parse(formatSarif(report));

    expect(sarif.$schema).toContain('sarif-schema-2.1.0.json');
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('pubguard');
    expect(sarif.runs[0].tool.driver.version).toBe('1.0.0');
    expect(sarif.runs[0].tool.driver.rules).toEqual([]);
    expect(sarif.runs[0].results).toEqual([]);
  });

  it('maps severities correctly: error->error, warn->warning, info->note', () => {
    const report = makeReport({
      results: [
        { ruleId: 'rule-a', severity: 'error', message: 'Error found', file: 'a.js' },
        { ruleId: 'rule-b', severity: 'warn', message: 'Warning found', file: 'b.js' },
        { ruleId: 'rule-c', severity: 'info', message: 'Info found', file: 'c.js' },
      ],
    });

    const sarif = JSON.parse(formatSarif(report));
    const results = sarif.runs[0].results;

    expect(results[0].level).toBe('error');
    expect(results[1].level).toBe('warning');
    expect(results[2].level).toBe('note');
  });

  it('includes rule metadata in driver.rules', () => {
    const report = makeReport({
      results: [
        {
          ruleId: 'sourcemap-leak',
          severity: 'error',
          message: 'Source map found',
          file: 'dist/app.js.map',
        },
      ],
    });

    const sarif = JSON.parse(formatSarif(report));
    const rules = sarif.runs[0].tool.driver.rules;

    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('sourcemap-leak');
    expect(rules[0].shortDescription.text).toBeTruthy();
    expect(rules[0].defaultConfiguration.level).toBe('error');
  });

  it('includes fix suggestions as message.markdown', () => {
    const report = makeReport({
      results: [
        {
          ruleId: 'env-file',
          severity: 'error',
          message: '.env file detected',
          file: '.env',
          fix: 'Add .env to .npmignore',
        },
      ],
    });

    const sarif = JSON.parse(formatSarif(report));
    const result = sarif.runs[0].results[0];

    expect(result.message.text).toBe('.env file detected');
    expect(result.message.markdown).toContain('Add .env to .npmignore');
    expect(result.message.markdown).toContain('Suggested fix');
  });

  it('omits markdown field when no fix is provided', () => {
    const report = makeReport({
      results: [
        {
          ruleId: 'custom-rule',
          severity: 'info',
          message: 'Just info',
          file: 'file.js',
        },
      ],
    });

    const sarif = JSON.parse(formatSarif(report));
    const result = sarif.runs[0].results[0];

    expect(result.message.text).toBe('Just info');
    expect(result.message.markdown).toBeUndefined();
  });

  it('includes file location in results', () => {
    const report = makeReport({
      results: [
        {
          ruleId: 'sourcemap-leak',
          severity: 'error',
          message: 'leak',
          file: 'dist/bundle.js.map',
        },
      ],
    });

    const sarif = JSON.parse(formatSarif(report));
    const location = sarif.runs[0].results[0].locations[0];

    expect(location.physicalLocation.artifactLocation.uri).toBe('dist/bundle.js.map');
  });

  it('de-duplicates rules when multiple results share a ruleId', () => {
    const report = makeReport({
      results: [
        { ruleId: 'env-file', severity: 'error', message: '.env found', file: '.env' },
        { ruleId: 'env-file', severity: 'error', message: '.env.local found', file: '.env.local' },
      ],
    });

    const sarif = JSON.parse(formatSarif(report));
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(1);
    expect(sarif.runs[0].results).toHaveLength(2);
  });
});
