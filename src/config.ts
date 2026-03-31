import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PubguardConfig } from './types.js';

const CONFIG_FILENAMES = [
  '.pubguardrc.json',
  '.pubguardrc',
  'pubguard.config.json',
];

const DEFAULT_CONFIG: PubguardConfig = {
  rules: {
    'sourcemap-leak': 'error',
    'sourcemap-reference': 'warn',
    'env-file': 'error',
    'private-key': 'error',
    'system-prompt': 'error',
    'unminified-source': 'warn',
    'debug-config': 'warn',
    'internal-url': 'warn',
  },
  ignore: [],
  thresholds: {},
};

export async function loadConfig(cwd: string, configPath?: string): Promise<PubguardConfig> {
  if (configPath) {
    return mergeConfig(await readJsonFile(configPath));
  }

  for (const filename of CONFIG_FILENAMES) {
    const fullPath = join(cwd, filename);
    try {
      return mergeConfig(await readJsonFile(fullPath));
    } catch {
      // File not found, try next
    }
  }

  return { ...DEFAULT_CONFIG };
}

function mergeConfig(partial: Partial<PubguardConfig>): PubguardConfig {
  return {
    rules: { ...DEFAULT_CONFIG.rules, ...partial.rules },
    ignore: partial.ignore ?? DEFAULT_CONFIG.ignore,
    thresholds: { ...DEFAULT_CONFIG.thresholds, ...partial.thresholds },
  };
}

async function readJsonFile(path: string): Promise<Partial<PubguardConfig>> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw);
}
