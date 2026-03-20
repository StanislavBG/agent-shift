import chalk from 'chalk';
import { loadSnapshotHistory, loadSnapshot, setCurrentSnapshot } from '../snapshot/index.js';

export interface RollbackOptions {
  env: string;
  to?: string;        // snapshot ID or version tag
  steps?: number;     // go back N steps (default 1)
  list?: boolean;     // list available snapshots
  json?: boolean;
  dryRun?: boolean;
}

export function runRollback(opts: RollbackOptions): void {
  const history = loadSnapshotHistory(opts.env);

  if (opts.list) {
    printHistory(history, opts.json);
    return;
  }

  if (history.length === 0) {
    console.error(chalk.red(`✗ No snapshot history for environment: ${opts.env}`));
    process.exit(2);
  }

  let targetId: string;

  if (opts.to) {
    // Find by ID prefix or version tag
    const match = history.find(s =>
      s.id.startsWith(opts.to!) || s.version === opts.to
    );
    if (!match) {
      console.error(chalk.red(`✗ Snapshot not found: ${opts.to}`));
      console.error(chalk.dim(`  Available: ${history.map(s => s.id.slice(0, 8) + ' (' + s.version + ')').join(', ')}`));
      process.exit(2);
    }
    targetId = match.id;
  } else {
    // Go back N steps from current (current is last in history)
    const steps = opts.steps ?? 1;
    const targetIndex = history.length - 1 - steps;
    if (targetIndex < 0) {
      console.error(chalk.red(`✗ Cannot go back ${steps} step(s) — only ${history.length} snapshot(s) in history`));
      process.exit(2);
    }
    targetId = history[targetIndex].id;
  }

  const target = loadSnapshot(targetId);
  const currentId = history[history.length - 1]?.id;

  if (opts.dryRun) {
    console.log('');
    console.log(chalk.bold('  agent-shift rollback (dry run)'));
    console.log('');
    console.log(`  Environment  ${chalk.cyan(opts.env)}`);
    console.log(`  Current      ${currentId?.slice(0, 16)}...`);
    console.log(`  Would revert to  ${target.id.slice(0, 16)}... (v${target.version})`);
    console.log('');
    return;
  }

  setCurrentSnapshot(opts.env, targetId);

  if (opts.json) {
    process.stdout.write(JSON.stringify({ rolledBack: true, environment: opts.env, snapshotId: targetId, version: target.version }, null, 2) + '\n');
    return;
  }

  console.log('');
  console.log(chalk.bold('  agent-shift rollback'));
  console.log('');
  console.log(`  ${chalk.green('✓')} Reverted`);
  console.log(`  Environment  ${chalk.cyan(opts.env)}`);
  console.log(`  Snapshot     ${target.id.slice(0, 16)}...`);
  console.log(`  Version      ${target.version}`);
  console.log(`  Model        ${target.config.model}`);
  console.log('');
}

function printHistory(history: ReturnType<typeof loadSnapshotHistory>, json?: boolean): void {
  if (json) {
    process.stdout.write(JSON.stringify(history, null, 2) + '\n');
    return;
  }

  if (history.length === 0) {
    console.log(chalk.dim('  (no snapshots)'));
    return;
  }

  console.log('');
  console.log(chalk.bold('  Snapshot history'));
  console.log('');
  console.log(`  ${'ID'.padEnd(18)} ${'Version'.padEnd(12)} ${'Model'.padEnd(24)} Timestamp`);
  console.log(`  ${'-'.repeat(80)}`);

  for (let i = 0; i < history.length; i++) {
    const s = history[i];
    const current = i === history.length - 1;
    const marker = current ? chalk.green('→ ') : '  ';
    console.log(`${marker}${s.id.slice(0, 16).padEnd(18)} ${s.version.padEnd(12)} ${s.config.model.padEnd(24)} ${s.timestamp}`);
  }

  console.log('');
}
