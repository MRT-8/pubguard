import { describe, it, expect } from 'vitest';
import { systemPromptRule } from '../../src/rules/system-prompt.js';
import type { FileEntry } from '../../src/types.js';

function makeFile(path: string, content: string): FileEntry {
  return { path, size: Buffer.byteLength(content), content: Buffer.from(content) };
}

// Pad content to exceed MIN_CONTENT_LENGTH
function pad(content: string): string {
  return content + '\n' + ' '.repeat(200);
}

describe('system-prompt rule', () => {
  it('detects SYSTEM_PROMPT variable', () => {
    const content = pad('const SYSTEM_PROMPT = "You are a helpful assistant..."');
    const results = systemPromptRule.detect(makeFile('package/dist/index.js', content));
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
    expect(results[0].ruleId).toBe('system-prompt');
  });

  it('detects systemPrompt assignment', () => {
    const content = pad('const systemPrompt = `You are an AI coding assistant...`');
    const results = systemPromptRule.detect(makeFile('package/dist/app.js', content));
    expect(results).toHaveLength(1);
  });

  it('detects OpenAI-style system message', () => {
    const content = pad('{ role: "system", content: "You are a helpful assistant" }');
    const results = systemPromptRule.detect(makeFile('package/dist/config.js', content));
    expect(results).toHaveLength(1);
  });

  it('detects <system> XML tags', () => {
    const content = pad('<system>You are a helpful AI that always responds politely</system>');
    const results = systemPromptRule.detect(makeFile('package/dist/prompt.txt', content));
    expect(results).toHaveLength(1);
  });

  it('ignores short content (below threshold)', () => {
    const content = 'SYSTEM_PROMPT = "hi"';
    const results = systemPromptRule.detect(makeFile('package/dist/index.js', content));
    expect(results).toHaveLength(0);
  });

  it('ignores non-text files', () => {
    const content = pad('SYSTEM_PROMPT = "You are a helpful assistant"');
    const results = systemPromptRule.detect(makeFile('package/dist/image.png', content));
    expect(results).toHaveLength(0);
  });

  it('ignores files without system prompt patterns', () => {
    const content = pad('export function add(a: number, b: number) { return a + b; }');
    const results = systemPromptRule.detect(makeFile('package/dist/math.js', content));
    expect(results).toHaveLength(0);
  });
});
