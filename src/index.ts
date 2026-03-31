export { analyze } from './analyzer.js';
export { loadConfig } from './config.js';
export { formatReport } from './reporter.js';
export { formatSarif } from './sarif.js';
export { loadCustomRules } from './custom-rules.js';
export { readTarball } from './utils/tarball.js';
export { builtinRules, getRuleById } from './rules/index.js';
export type {
  Rule,
  RuleResult,
  FileEntry,
  PubguardConfig,
  ScanReport,
  Severity,
} from './types.js';
