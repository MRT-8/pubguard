export type Severity = 'error' | 'warn' | 'info';

export interface RuleResult {
  ruleId: string;
  severity: Severity;
  message: string;
  file: string;
  fix?: string;
}

export interface FileEntry {
  path: string;
  size: number;
  content: Buffer;
}

export interface Rule {
  id: string;
  defaultSeverity: Severity;
  description: string;
  detect(file: FileEntry): RuleResult[];
}

export interface PubguardConfig {
  rules: Record<string, Severity | 'off'>;
  ignore: string[];
  thresholds: {
    'max-package-size'?: string;
    'max-file-size'?: string;
  };
}

export interface ScanReport {
  packageName?: string;
  totalFiles: number;
  totalSize: number;
  results: RuleResult[];
  passed: boolean;
}
