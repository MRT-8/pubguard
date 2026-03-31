import { describe, it, expect } from 'vitest';
import { unminifiedSourceRule } from '../../src/rules/unminified-source.js';
import type { FileEntry } from '../../src/types.js';

function makeFile(path: string, content: string): FileEntry {
  return { path, size: Buffer.byteLength(content), content: Buffer.from(content) };
}

function generateUnminifiedSource(lineCount: number): string {
  const lines: string[] = [];
  lines.push('import { readFile, writeFile, appendFile } from "node:fs/promises";');
  lines.push('import { join, resolve, dirname, basename } from "node:path";');
  lines.push('import { createServer } from "node:http";');
  lines.push('export class ApplicationController {');
  for (let i = 0; i < lineCount - 8; i++) {
    lines.push(`  export function handler${i}(request, response) { const data = JSON.stringify({ ok: true, id: ${i} }); return response.json(data); }`);
  }
  lines.push('}');
  lines.push('export const config = { debug: false, port: 3000 };');
  lines.push('export class ServiceWorker extends ApplicationController {}');
  lines.push('module.exports = ApplicationController;');
  return lines.join('\n');
}

function generateMinifiedContent(sizeKB: number): string {
  // Single very long line with few keywords — simulates minified code
  const base = 'var a=1;';
  return base.repeat(Math.ceil((sizeKB * 1024) / base.length));
}

describe('unminified-source rule', () => {
  it('detects large unminified JS files', () => {
    const content = generateUnminifiedSource(600);
    const file = makeFile('package/dist/app.js', content);
    const results = unminifiedSourceRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe('unminified-source');
    expect(results[0].severity).toBe('warn');
    expect(results[0].message).toContain('unminified');
  });

  it('ignores .min.js files', () => {
    const content = generateUnminifiedSource(600);
    const file = makeFile('package/dist/app.min.js', content);
    const results = unminifiedSourceRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('ignores files smaller than 50KB', () => {
    const content = 'function hello() { return true; }\n'.repeat(20);
    const file = makeFile('package/dist/small.js', content);
    const results = unminifiedSourceRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('ignores non-JS files', () => {
    const content = generateUnminifiedSource(600);
    const file = makeFile('package/docs/readme.md', content);
    const results = unminifiedSourceRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('ignores minified content (low avg line length)', () => {
    const content = generateMinifiedContent(60);
    const file = makeFile('package/dist/bundle.js', content);
    const results = unminifiedSourceRule.detect(file);
    expect(results).toHaveLength(0);
  });

  it('detects unminified .mjs files', () => {
    const content = generateUnminifiedSource(600);
    const file = makeFile('package/dist/app.mjs', content);
    const results = unminifiedSourceRule.detect(file);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('app.mjs');
  });

  it('ignores files with fewer than 500 lines', () => {
    // Generate content that is > 50KB but has < 500 lines (very long lines)
    const longLine = 'function a() { ' + 'x = 1; '.repeat(200) + ' }';
    const lines = Array(400).fill(longLine);
    const content = lines.join('\n');
    const file = makeFile('package/dist/wide.js', content);
    // This has < 500 lines even though file is large
    const results = unminifiedSourceRule.detect(file);
    expect(results).toHaveLength(0);
  });
});
