import type { ScanReport, Severity } from './types.js';

const SEVERITY_COLORS: Record<Severity, string> = {
  error: '\x1b[31m',  // red
  warn: '\x1b[33m',   // yellow
  info: '\x1b[36m',   // cyan
};
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const SEVERITY_ICONS: Record<Severity, string> = {
  error: 'x',
  warn: '!',
  info: 'i',
};

export function formatReport(report: ScanReport, json: boolean): string {
  if (json) {
    return JSON.stringify(report, null, 2);
  }

  const lines: string[] = [];

  lines.push('');
  lines.push(`${BOLD}pubguard${RESET} scan results`);
  lines.push(`${DIM}${report.totalFiles} files, ${formatSize(report.totalSize)}${RESET}`);
  lines.push('');

  if (report.results.length === 0) {
    lines.push(`  ${BOLD}\x1b[32m✓${RESET} No issues found`);
    lines.push('');
    return lines.join('\n');
  }

  // Group by severity
  const errors = report.results.filter((r) => r.severity === 'error');
  const warns = report.results.filter((r) => r.severity === 'warn');
  const infos = report.results.filter((r) => r.severity === 'info');

  for (const result of report.results) {
    const color = SEVERITY_COLORS[result.severity];
    const icon = SEVERITY_ICONS[result.severity];
    lines.push(`  ${color}${icon}${RESET} ${result.message}`);
    if (result.fix) {
      lines.push(`    ${DIM}fix: ${result.fix}${RESET}`);
    }
    lines.push('');
  }

  // Summary
  const parts: string[] = [];
  if (errors.length) parts.push(`${SEVERITY_COLORS.error}${errors.length} error(s)${RESET}`);
  if (warns.length) parts.push(`${SEVERITY_COLORS.warn}${warns.length} warning(s)${RESET}`);
  if (infos.length) parts.push(`${SEVERITY_COLORS.info}${infos.length} info${RESET}`);

  lines.push(`${DIM}───${RESET}`);
  lines.push(`  ${parts.join('  ')}`);
  lines.push('');

  if (!report.passed) {
    lines.push(`${SEVERITY_COLORS.error}${BOLD}  Publish blocked — fix errors above before publishing${RESET}`);
    lines.push('');
  }

  return lines.join('\n');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
