import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig, resolveEnvironment } from '../config/index.js';
import { createSnapshot, saveSnapshot } from '../snapshot/index.js';

export interface SnapshotOptions {
  env: string;
  config?: string;
  tag?: string;
  json?: boolean;
}

export function runSnapshot(opts: SnapshotOptions): void {
  let agentConfig;
  try {
    agentConfig = loadConfig(opts.config);
  } catch (e) {
    console.error(chalk.red(`✗ ${(e as Error).message}`));
    process.exit(2);
  }

  let resolved;
  try {
    resolved = resolveEnvironment(agentConfig, opts.env);
  } catch (e) {
    console.error(chalk.red(`✗ ${(e as Error).message}`));
    process.exit(2);
  }

  const version = opts.tag ?? agentConfig.version;
  const baseDir = path.resolve(process.cwd(), path.dirname(opts.config ?? '.agent-shift.yaml'));

  const snapshot = createSnapshot({
    environment: opts.env,
    version,
    config: resolved,
    baseDir: process.cwd(),
  });

  saveSnapshot(snapshot, process.cwd());

  if (opts.json) {
    process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
    return;
  }

  console.log('');
  console.log(chalk.bold('  agent-shift snapshot'));
  console.log('');
  console.log(`  Environment  ${chalk.cyan(opts.env)}`);
  console.log(`  Version      ${chalk.cyan(version)}`);
  console.log(`  Snapshot ID  ${chalk.cyan(snapshot.id.slice(0, 16))}...`);
  console.log(`  Model        ${snapshot.config.model}`);

  const promptCount = Object.keys(snapshot.promptHashes).length;
  const toolCount = snapshot.config.tools.length;

  console.log(`  Prompts      ${promptCount} hashed`);
  console.log(`  Tools        ${toolCount} versioned`);
  console.log('');
  console.log(`  ${chalk.green('✓')} Snapshot saved  ${chalk.dim('.agent-shift/snapshots/' + snapshot.id.slice(0, 8) + '...')}`);
  console.log('');
}
