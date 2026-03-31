import type { Rule, FileEntry, RuleResult } from '../types.js';

// Patterns that indicate system prompt content in source code
const SYSTEM_PROMPT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /["'`]system["'`]\s*:\s*["'`]You are/i, label: 'system role with "You are" preamble' },
  { pattern: /SYSTEM_PROMPT\s*=/, label: 'SYSTEM_PROMPT variable assignment' },
  { pattern: /systemPrompt\s*[:=]/, label: 'systemPrompt variable assignment' },
  { pattern: /system_prompt\s*[:=]/, label: 'system_prompt variable assignment' },
  { pattern: /<system>[\s\S]{20,}<\/system>/i, label: '<system> XML tag block' },
  { pattern: /role\s*:\s*["'`]system["'`][\s\S]{0,50}content\s*:\s*["'`]/, label: 'OpenAI-style system message' },
  { pattern: /\bsystem_instruction\s*[:=]\s*["'`]/, label: 'system_instruction assignment' },
  { pattern: /\bpreamble\s*[:=]\s*["'`]You are/i, label: 'preamble with "You are"' },
];

// Minimum content length to reduce false positives on short test strings
const MIN_CONTENT_LENGTH = 100;

export const systemPromptRule: Rule = {
  id: 'system-prompt',
  defaultSeverity: 'error',
  description: 'Detect AI system prompts embedded in published code',

  detect(file: FileEntry): RuleResult[] {
    const results: RuleResult[] = [];

    const ext = file.path.split('.').pop()?.toLowerCase();
    // Only scan text-like files
    if (!ext || !['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'json', 'yaml', 'yml', 'py', 'txt'].includes(ext)) {
      return results;
    }

    if (file.size > 10 * 1024 * 1024) return results; // Skip files > 10MB

    const content = file.content.toString('utf-8');
    if (content.length < MIN_CONTENT_LENGTH) return results;

    for (const { pattern, label } of SYSTEM_PROMPT_PATTERNS) {
      if (pattern.test(content)) {
        results.push({
          ruleId: this.id,
          severity: this.defaultSeverity,
          message: `"${file.path}" appears to contain an AI system prompt (${label}) — system prompts often contain proprietary logic and should not be published`,
          file: file.path,
          fix: `Move system prompts to environment variables, a private config service, or an external file excluded from the package`,
        });
        break; // One finding per file is enough
      }
    }

    return results;
  },
};
