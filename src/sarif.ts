import type { ScanReport, RuleResult, Severity } from './types.js';
import { builtinRules } from './rules/index.js';

const SARIF_SCHEMA =
  'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json';

const SEVERITY_TO_LEVEL: Record<Severity, string> = {
  error: 'error',
  warn: 'warning',
  info: 'note',
};

interface SarifRule {
  id: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: string };
}

interface SarifResult {
  ruleId: string;
  level: string;
  message: { text: string; markdown?: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
    };
  }>;
}

/**
 * Format a ScanReport as a SARIF v2.1.0 JSON string.
 */
export function formatSarif(report: ScanReport): string {
  // Collect unique rule IDs from results
  const ruleIds = [...new Set(report.results.map((r) => r.ruleId))];

  // Build the rules array from builtin rules + any unknown rule IDs
  const rules: SarifRule[] = ruleIds.map((id) => {
    const builtin = builtinRules.find((r) => r.id === id);
    return {
      id,
      shortDescription: {
        text: builtin?.description ?? id,
      },
      defaultConfiguration: {
        level: builtin ? SEVERITY_TO_LEVEL[builtin.defaultSeverity] : 'warning',
      },
    };
  });

  // Build the rule index map for ruleIndex references
  const ruleIndexMap = new Map<string, number>();
  ruleIds.forEach((id, index) => {
    ruleIndexMap.set(id, index);
  });

  // Build results
  const results: SarifResult[] = report.results.map((r: RuleResult) => {
    const result: SarifResult = {
      ruleId: r.ruleId,
      level: SEVERITY_TO_LEVEL[r.severity],
      message: { text: r.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: r.file },
          },
        },
      ],
    };

    if (r.fix) {
      result.message.markdown = `${r.message}\n\n**Suggested fix:** ${r.fix}`;
    }

    return result;
  });

  const sarif = {
    $schema: SARIF_SCHEMA,
    version: '2.1.0' as const,
    runs: [
      {
        tool: {
          driver: {
            name: 'PubGuard',
            version: '1.0.0',
            rules,
          },
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
