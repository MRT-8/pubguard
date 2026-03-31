import { describe, it, expect } from 'vitest';
import { internalUrlRule } from '../../src/rules/internal-url.js';
import type { FileEntry } from '../../src/types.js';

function makeFile(path: string, content: string): FileEntry {
  return { path, size: Buffer.byteLength(content), content: Buffer.from(content) };
}

// Pad content to ensure it exceeds the 100-byte minimum
function pad(content: string): string {
  const padding = '// ' + 'x'.repeat(120) + '\n';
  return padding + content;
}

describe('internal-url rule', () => {
  it('detects internal domain URLs', () => {
    const content = pad('const apiUrl = "https://api.internal.company.com/v1/users";');
    const file = makeFile('package/dist/config.js', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe('internal-url');
    expect(results[0].severity).toBe('warn');
    expect(results[0].message).toContain('internal domain');
  });

  it('detects corporate domain URLs', () => {
    const content = pad('const endpoint = "https://services.corp.example.com/api";');
    const file = makeFile('package/dist/api.js', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('corporate domain');
  });

  it('detects localhost URLs with port', () => {
    const content = pad('{ "apiBase": "http://localhost:3000/api" }');
    const file = makeFile('package/config.json', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('localhost');
  });

  it('detects 127.0.0.1 URLs', () => {
    const content = pad('const server = "http://127.0.0.1:8080/health";');
    const file = makeFile('package/dist/server.js', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('loopback');
  });

  it('detects private 10.x.x.x IP URLs', () => {
    const content = pad('const dbHost = "http://10.0.1.55:5432/mydb";');
    const file = makeFile('package/dist/db.ts', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('private IP (10.x.x.x)');
  });

  it('detects private 192.168.x.x IP URLs', () => {
    const content = pad('const printer = "http://192.168.1.100:9100/print";');
    const file = makeFile('package/dist/print.js', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('private IP (192.168.x.x)');
  });

  it('ignores files smaller than 100 bytes', () => {
    const content = 'http://localhost:3000';
    const file = makeFile('package/tiny.js', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('ignores files without target extensions', () => {
    const content = 'This file has http://localhost:3000 inside it and is large enough to be checked.';
    const file = makeFile('package/readme.md', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('ignores files without internal URLs', () => {
    const content = pad('const api = "https://api.example.com/v1/users"; // public API endpoint for production');
    const file = makeFile('package/dist/config.js', content);
    const results = internalUrlRule.detect(file);
    expect(results).toHaveLength(0);
  });
});
