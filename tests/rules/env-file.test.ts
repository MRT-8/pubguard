import { describe, it, expect } from 'vitest';
import { envFileRule } from '../../src/rules/env-file.js';
import type { FileEntry } from '../../src/types.js';

function makeFile(path: string): FileEntry {
  return { path, size: 100, content: Buffer.from('KEY=value') };
}

describe('env-file rule', () => {
  it('detects .env file', () => {
    const results = envFileRule.detect(makeFile('package/.env'));
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
  });

  it('detects .env.local', () => {
    const results = envFileRule.detect(makeFile('package/.env.local'));
    expect(results).toHaveLength(1);
  });

  it('detects .env.production', () => {
    const results = envFileRule.detect(makeFile('package/.env.production'));
    expect(results).toHaveLength(1);
  });

  it('detects credentials.json', () => {
    const results = envFileRule.detect(makeFile('package/credentials.json'));
    expect(results).toHaveLength(1);
  });

  it('detects .npmrc', () => {
    const results = envFileRule.detect(makeFile('package/.npmrc'));
    expect(results).toHaveLength(1);
  });

  it('ignores normal files', () => {
    const results = envFileRule.detect(makeFile('package/dist/index.js'));
    expect(results).toHaveLength(0);
  });

  it('ignores package.json', () => {
    const results = envFileRule.detect(makeFile('package/package.json'));
    expect(results).toHaveLength(0);
  });
});
