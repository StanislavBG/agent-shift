#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runSnapshot } from './commands/snapshot.js';
import { runDiff } from './commands/diff.js';
import { runPromote } from './commands/promote.js';
import { runRollback } from './commands/rollback.js';
import { runCheck } from './commands/check.js';

const program = new Command();

program
  .name('agent-shift')
  .description('Agent config versioning with environment promotion and rollback. The deploy step in the Preflight pipeline.')
  .version('0.2.0');

// ── init ──────────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Scaffold .agent-shift.yaml config in the current directory')
  .option('--output <path>', 'Output path (default: .agent-shift.yaml)')
  .action((opts: { output?: string }) => {
    runInit(opts);
  });

// ── snapshot ──────────────────────────────────────────────────────────────────
program
  .command('snapshot')
  .description('Capture current agent config as a versioned snapshot with sha256 hash')
  .requiredOption('--env <environment>', 'Environment to snapshot (e.g. staging, production)')
  .option('--config <path>', 'Path to .agent-shift.yaml (default: .agent-shift.yaml)')
  .option('--tag <version>', 'Override version tag for this snapshot')
  .option('--json', 'Output result as JSON')
  .action((opts: { env: string; config?: string; tag?: string; json?: boolean }) => {
    runSnapshot(opts);
  });

// ── diff ──────────────────────────────────────────────────────────────────────
program
  .command('diff <source> <target>')
  .description('Compare configs between two environments or snapshots')
  .option('--config <path>', 'Path to .agent-shift.yaml')
  .option('--json', 'Output result as JSON')
  .option('--format <format>', 'Output format: sarif or junit')
  .action((source: string, target: string, opts: { config?: string; json?: boolean; format?: string }) => {
    const format = opts.format === 'sarif' || opts.format === 'junit' ? opts.format : undefined;
    runDiff({ source, target, config: opts.config, json: opts.json, format });
  });

// ── promote ───────────────────────────────────────────────────────────────────
program
  .command('promote <source>')
  .description('Promote validated config from one environment to another')
  .requiredOption('--to <environment>', 'Target environment (e.g. production)')
  .option('--snapshot-id <id>', 'Promote a specific snapshot ID instead of current')
  .option('--require-gate-pass <path>', 'Path to agent-gate pass receipt file (JSON)')
  .option('--dry-run', 'Preview what would be promoted without writing')
  .option('--json', 'Output result as JSON')
  .action((source: string, opts: {
    to: string;
    snapshotId?: string;
    requireGatePass?: string;
    dryRun?: boolean;
    json?: boolean;
  }) => {
    runPromote({ source, to: opts.to, snapshotId: opts.snapshotId, requireGatePass: opts.requireGatePass, dryRun: opts.dryRun, json: opts.json });
  });

// ── rollback ──────────────────────────────────────────────────────────────────
program
  .command('rollback <environment>')
  .description('Revert environment to a prior snapshot')
  .option('--to <id-or-version>', 'Target snapshot ID (prefix) or version tag')
  .option('--steps <n>', 'Go back N steps from current (default: 1)', parseInt)
  .option('--list', 'List available snapshots for this environment')
  .option('--dry-run', 'Preview rollback without writing')
  .option('--json', 'Output result as JSON')
  .action((env: string, opts: { to?: string; steps?: number; list?: boolean; dryRun?: boolean; json?: boolean }) => {
    runRollback({ env, ...opts });
  });

// ── check ─────────────────────────────────────────────────────────────────────
program
  .command('check <source> <target>')
  .description('CI/CD gate: fail if config has drifted between environments')
  .option('--json', 'Output result as JSON')
  .option('--no-exit-on-drift', 'Exit 0 even on drift (report-only mode)')
  .option('--format <format>', 'Output format: sarif or junit')
  .action((source: string, target: string, opts: { json?: boolean; exitOnDrift?: boolean; format?: string }) => {
    const format = opts.format === 'sarif' || opts.format === 'junit' ? opts.format : undefined;
    runCheck({ source, target, json: opts.json, exitOnDrift: opts.exitOnDrift, format });
  });

program.parse();
