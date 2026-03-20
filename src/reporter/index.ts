/**
 * agent-shift reporter — SARIF 2.1.0 and JUnit XML output
 */

import type { DiffResult, DiffEntry } from '../types/index.js';

// ── SARIF ─────────────────────────────────────────────────────────────────────

/** Returns the SARIF rule ID for a given DiffEntry */
function ruleIdForEntry(entry: DiffEntry): string {
  if (entry.field === 'model') return 'model-change';
  if (entry.type === 'added') return 'config-added';
  if (entry.type === 'removed') return 'config-removed';
  return 'config-drift';
}

/** Returns SARIF level for a DiffEntry */
function levelForEntry(entry: DiffEntry): 'error' | 'warning' {
  return entry.field === 'model' ? 'error' : 'warning';
}

function safeString(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  return String(v);
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  helpUri?: string;
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations?: Array<{
    logicalLocations: Array<{ name: string; kind: string }>;
  }>;
}

interface SarifLog {
  version: string;
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}

export function formatSarif(diff: DiffResult, tool: string): string {
  const actionableChanges = diff.changes.filter(c => c.type !== 'unchanged');

  // Collect unique rules
  const ruleMap = new Map<string, SarifRule>();
  const ruleDefinitions: Record<string, SarifRule> = {
    'config-drift': {
      id: 'config-drift',
      name: 'ConfigDrift',
      shortDescription: { text: 'Configuration field has changed between environments' },
    },
    'model-change': {
      id: 'model-change',
      name: 'ModelChange',
      shortDescription: { text: 'Agent model has changed between environments — high-impact change' },
    },
    'config-added': {
      id: 'config-added',
      name: 'ConfigAdded',
      shortDescription: { text: 'Configuration field added in target environment' },
    },
    'config-removed': {
      id: 'config-removed',
      name: 'ConfigRemoved',
      shortDescription: { text: 'Configuration field removed in target environment' },
    },
  };

  const results: SarifResult[] = [];

  for (const entry of actionableChanges) {
    const ruleId = ruleIdForEntry(entry);
    if (!ruleMap.has(ruleId)) {
      ruleMap.set(ruleId, ruleDefinitions[ruleId]);
    }

    let messageText: string;
    if (entry.type === 'changed') {
      messageText = `Field "${entry.field}" changed: ${safeString(entry.from)} → ${safeString(entry.to)} (${diff.source} → ${diff.target})`;
    } else if (entry.type === 'added') {
      messageText = `Field "${entry.field}" added in ${diff.target}: ${safeString(entry.to)}`;
    } else {
      messageText = `Field "${entry.field}" removed in ${diff.target} (was: ${safeString(entry.from)})`;
    }

    results.push({
      ruleId,
      level: levelForEntry(entry),
      message: { text: messageText },
      locations: [
        {
          logicalLocations: [
            { name: `${diff.source}→${diff.target}`, kind: 'module' },
          ],
        },
      ],
    });
  }

  const sarif: SarifLog = {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: tool,
            version: '0.2.0',
            informationUri: 'https://github.com/bilko/agent-shift',
            rules: Array.from(ruleMap.values()),
          },
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

// ── JUnit XML ─────────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatJunit(diff: DiffResult): string {
  const actionableChanges = diff.changes.filter(c => c.type !== 'unchanged');
  const suiteName = `config-drift ${diff.source}→${diff.target}`;
  const timestamp = new Date().toISOString();

  let testcases: string;
  let failures = 0;

  if (actionableChanges.length === 0) {
    testcases = `    <testcase name="no-drift" classname="agent-shift" time="0"/>\n`;
  } else {
    const parts: string[] = [];
    for (const entry of actionableChanges) {
      const caseName = escapeXml(`${entry.type}: ${entry.field}`);
      const className = 'agent-shift.config-drift';
      let failureMsg: string | null = null;

      if (entry.type === 'changed') {
        failureMsg = `Field "${entry.field}" changed from ${safeString(entry.from)} to ${safeString(entry.to)}`;
      } else if (entry.type === 'added') {
        failureMsg = `Field "${entry.field}" added in ${diff.target}: ${safeString(entry.to)}`;
      } else if (entry.type === 'removed') {
        failureMsg = `Field "${entry.field}" removed in ${diff.target} (was: ${safeString(entry.from)})`;
      }

      if (failureMsg !== null) {
        failures++;
        parts.push(
          `    <testcase name="${caseName}" classname="${className}" time="0">\n` +
          `      <failure message="${escapeXml(failureMsg)}" type="ConfigDrift">${escapeXml(failureMsg)}</failure>\n` +
          `    </testcase>`,
        );
      } else {
        parts.push(`    <testcase name="${caseName}" classname="${className}" time="0"/>`);
      }
    }
    testcases = parts.join('\n') + '\n';
  }

  const totalTests = actionableChanges.length === 0 ? 1 : actionableChanges.length;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="agent-shift" tests="${totalTests}" failures="${failures}" time="0">`,
    `  <testsuite name="${escapeXml(suiteName)}" tests="${totalTests}" failures="${failures}" timestamp="${timestamp}" time="0">`,
    testcases.trimEnd(),
    '  </testsuite>',
    '</testsuites>',
    '',
  ].join('\n');
}
