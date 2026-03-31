#!/usr/bin/env node

import { resolve } from 'node:path';
import { readTarball } from './utils/tarball.js';
import { getNpmPackList } from './utils/packlist.js';
import { loadConfig } from './config.js';
import { analyze } from './analyzer.js';
import { formatReport } from './reporter.js';
import { formatSarif } from './sarif.js';
import type { FileEntry } from './types.js';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';

const VERSION = '1.0.0';

type Format = 'text' | 'json' | 'sarif';

interface CliOptions {
  command: string;
  target?: string;
  strict: boolean;
  format: Format;
  config?: string;
  output?: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = {
    command: '',
    strict: false,
    format: 'text',
    dryRun: false,
  };

  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--strict':
        options.strict = true;
        break;
      case '--json':
        options.format = 'json';
        break;
      case '--format':
      case '-f':
        options.format = (args[++i] as Format) || 'text';
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--config':
      case '-c':
        options.config = args[++i];
        break;
      case '--version':
      case '-v':
        console.log(VERSION);
        process.exit(0);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('-')) {
          positional.push(arg);
        }
    }
  }

  options.command = positional[0] || 'check';
  options.target = positional[1];

  return options;
}

function printHelp(): void {
  console.log(`
pubguard v${VERSION} — Guard what you publish

Usage:
  pubguard check [<file.tgz>] [options]
  pubguard check --dry-run [options]
  pubguard init

Commands:
  check    Scan a package for sensitive content (default)
  init     Create a default .pubguardrc.json config file

Options:
  --dry-run          Use npm pack --dry-run to determine files
  --strict           Exit with code 1 on any error-level finding
  --format, -f       Output format: text (default), json, sarif
  --json             Shorthand for --format json
  --output, -o       Write output to file instead of stdout
  --config, -c       Path to config file (default: auto-detect)
  --version          Show version
  --help             Show this help

Examples:
  pubguard check my-package-1.0.0.tgz --strict
  pubguard check --dry-run --strict
  pubguard check --dry-run --format sarif -o report.sarif
  npx pubguard check --dry-run
`);
}

const DEFAULT_CONFIG_CONTENT = `{
  "rules": {
    "sourcemap-leak": "error",
    "sourcemap-reference": "warn",
    "env-file": "error",
    "private-key": "error",
    "system-prompt": "error",
    "unminified-source": "warn",
    "debug-config": "warn",
    "internal-url": "warn"
  },
  "ignore": [],
  "thresholds": {
    "max-package-size": "10MB",
    "max-file-size": "5MB"
  }
}
`;

async function handleInit(cwd: string): Promise<void> {
  const configPath = resolve(cwd, '.pubguardrc.json');
  try {
    await stat(configPath);
    console.log('.pubguardrc.json already exists');
    return;
  } catch {
    // File doesn't exist, create it
  }
  await writeFile(configPath, DEFAULT_CONFIG_CONTENT, 'utf-8');
  console.log('Created .pubguardrc.json');
}

async function getFilesFromDryRun(cwd: string): Promise<FileEntry[]> {
  const fileList = await getNpmPackList(cwd);
  const entries: FileEntry[] = [];

  for (const filePath of fileList) {
    const fullPath = resolve(cwd, filePath);
    try {
      const info = await stat(fullPath);
      const content = await readFile(fullPath);
      entries.push({
        path: 'package/' + filePath,
        size: info.size,
        content,
      });
    } catch {
      // File listed but not readable, skip
    }
  }

  return entries;
}

async function getFilesFromPack(cwd: string): Promise<{ files: FileEntry[]; tgzPath: string }> {
  const tgzPath = await new Promise<string>((resolve, reject) => {
    execFile('npm', ['pack', '--pack-destination', cwd], { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(new Error(`npm pack failed: ${err.message}`));
      else resolve(stdout.trim().split('\n').pop()!);
    });
  });

  const fullPath = resolve(cwd, tgzPath);
  const files = await readTarball(fullPath);
  const { unlink } = await import('node:fs/promises');
  await unlink(fullPath).catch(() => {});
  return { files, tgzPath };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  const cwd = process.cwd();

  if (options.command === 'init') {
    await handleInit(cwd);
    return;
  }

  if (options.command !== 'check') {
    console.error(`Unknown command: ${options.command}`);
    printHelp();
    process.exit(1);
  }

  const config = await loadConfig(cwd, options.config);

  let files: FileEntry[];

  if (options.target) {
    const tgzPath = resolve(cwd, options.target);
    files = await readTarball(tgzPath);
  } else if (options.dryRun) {
    files = await getFilesFromDryRun(cwd);
  } else {
    const result = await getFilesFromPack(cwd);
    files = result.files;
  }

  const report = analyze(files, config);

  let output: string;
  switch (options.format) {
    case 'json':
      output = formatReport(report, true);
      break;
    case 'sarif':
      output = formatSarif(report);
      break;
    default:
      output = formatReport(report, false);
  }

  if (options.output) {
    await writeFile(resolve(cwd, options.output), output, 'utf-8');
    console.log(`Report written to ${options.output}`);
  } else {
    console.log(output);
  }

  if (options.strict && !report.passed) {
    process.exit(1);
  }

  if (report.results.some((r) => r.severity === 'error')) {
    process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`\x1b[31mpubguard error:\x1b[0m ${err.message}`);
  process.exit(2);
});
