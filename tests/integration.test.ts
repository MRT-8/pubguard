import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, loadConfig, readTarball } from '../src/index.js';
import type { PubguardConfig, ScanReport } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_SCRIPT = resolve(__dirname, 'fixtures/create-leak-fixture.py');
const FIXTURE_TGZ = resolve(__dirname, 'fixtures/leak-demo.tgz');

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

describe('integration: Claude Code source map leak fixture', () => {
  let report: ScanReport;

  beforeAll(async () => {
    // Generate the fixture tarball if it does not already exist
    if (!existsSync(FIXTURE_TGZ)) {
      execSync(`python3 "${FIXTURE_SCRIPT}"`, { stdio: 'inherit' });
    }

    const files = await readTarball(FIXTURE_TGZ);
    report = analyze(files, defaultConfig);
  });

  it('should fail the scan (report.passed is false)', () => {
    expect(report.passed).toBe(false);
  });

  it('should have at least 3 total findings', () => {
    expect(report.results.length).toBeGreaterThanOrEqual(3);
  });

  it('should detect sourcemap-leak (error) on dist/cli.js.map', () => {
    const finding = report.results.find((r) => r.ruleId === 'sourcemap-leak');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
    expect(finding!.file).toContain('cli.js.map');
  });

  it('should detect sourcemap-reference (warn) on dist/cli.js', () => {
    const finding = report.results.find((r) => r.ruleId === 'sourcemap-reference');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warn');
    expect(finding!.file).toContain('cli.js');
    expect(finding!.file).not.toContain('.map');
  });

  it('should detect env-file (error) on .env', () => {
    const finding = report.results.find((r) => r.ruleId === 'env-file');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
    expect(finding!.file).toContain('.env');
  });

  it('should detect system-prompt (error) because cli.js contains inlined system prompt', () => {
    const finding = report.results.find((r) => r.ruleId === 'system-prompt');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
    expect(finding!.file).toContain('cli.js');
  });

  it('should read the correct number of files from the tarball', async () => {
    const files = await readTarball(FIXTURE_TGZ);
    expect(files.length).toBe(4);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('package/package.json');
    expect(paths).toContain('package/dist/cli.js');
    expect(paths).toContain('package/dist/cli.js.map');
    expect(paths).toContain('package/.env');
  });

  it('should contain valid source map JSON with expected fields', async () => {
    const files = await readTarball(FIXTURE_TGZ);
    const mapFile = files.find((f) => f.path.endsWith('.map'));
    expect(mapFile).toBeDefined();

    const sourceMap = JSON.parse(mapFile!.content.toString('utf-8'));
    expect(sourceMap.version).toBe(3);
    expect(sourceMap.sources).toHaveLength(3);
    expect(sourceMap.sources).toContain('../src/bootstrap/state.ts');
    expect(sourceMap.sources).toContain('../src/coordinator/coordinatorMode.ts');
    expect(sourceMap.sources).toContain('../src/utils/envUtils.ts');
    expect(sourceMap.sourcesContent).toHaveLength(3);
    expect(sourceMap.mappings).toBe('AAAA;AACA;AACA;AACA;AAEA;AACA;BBBB;BCCC;CCCC;CDDD');
  });

  it('should load default config when no config file matches', async () => {
    // loadConfig with a non-existent directory falls back to defaults
    const config = await loadConfig('/tmp/nonexistent-pubguard-test-dir');
    expect(config.rules['sourcemap-leak']).toBe('error');
    expect(config.rules['env-file']).toBe('error');
    expect(config.rules['system-prompt']).toBe('error');
  });
});
