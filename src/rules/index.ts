import type { Rule } from '../types.js';
import { sourcemapLeakRule } from './sourcemap-leak.js';
import { sourcemapRefRule } from './sourcemap-ref.js';
import { envFileRule } from './env-file.js';
import { privateKeyRule } from './private-key.js';
import { systemPromptRule } from './system-prompt.js';
import { unminifiedSourceRule } from './unminified-source.js';
import { debugConfigRule } from './debug-config.js';
import { internalUrlRule } from './internal-url.js';

export const builtinRules: Rule[] = [
  sourcemapLeakRule,
  sourcemapRefRule,
  envFileRule,
  privateKeyRule,
  systemPromptRule,
  unminifiedSourceRule,
  debugConfigRule,
  internalUrlRule,
];

export function getRuleById(id: string): Rule | undefined {
  return builtinRules.find((r) => r.id === id);
}
