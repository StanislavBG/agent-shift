import chalk from 'chalk';
import { loadConfig } from '../config/index.js';
import { loadCurrentSnapshot } from '../snapshot/index.js';
import { diffSnapshots } from '../snapshot/diff.js';
import { formatSarif, formatJunit } from '../reporter/index.js';
export function runDiff(opts) {
    let agentConfig;
    try {
        agentConfig = loadConfig(opts.config);
    }
    catch (e) {
        console.error(chalk.red(`✗ ${e.message}`));
        process.exit(2);
    }
    // Load snapshots for both environments
    const sourceSnapshot = loadCurrentSnapshot(opts.source);
    const targetSnapshot = loadCurrentSnapshot(opts.target);
    if (!sourceSnapshot) {
        console.error(chalk.red(`✗ No snapshot found for environment: ${opts.source}`));
        console.error(chalk.dim(`  Run: agent-shift snapshot --env ${opts.source}`));
        process.exit(2);
    }
    if (!targetSnapshot) {
        console.error(chalk.red(`✗ No snapshot found for environment: ${opts.target}`));
        console.error(chalk.dim(`  Run: agent-shift snapshot --env ${opts.target}`));
        process.exit(2);
    }
    const result = diffSnapshots(sourceSnapshot, targetSnapshot);
    if (opts.format === 'sarif') {
        process.stdout.write(formatSarif(result, 'agent-shift') + '\n');
        process.exit(result.hasDrift ? 1 : 0);
    }
    if (opts.format === 'junit') {
        process.stdout.write(formatJunit(result) + '\n');
        process.exit(result.hasDrift ? 1 : 0);
    }
    if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        process.exit(result.hasDrift ? 1 : 0);
    }
    console.log('');
    console.log(chalk.bold('  agent-shift diff'));
    console.log('');
    console.log(`  ${chalk.dim(opts.source)} ${chalk.dim('@' + sourceSnapshot.id.slice(0, 8))}  →  ${chalk.dim(opts.target)} ${chalk.dim('@' + targetSnapshot.id.slice(0, 8))}`);
    console.log('');
    if (!result.hasDrift) {
        console.log(`  ${chalk.green('✓')} No drift — ${opts.source} and ${opts.target} are in sync`);
        console.log('');
        process.exit(0);
    }
    console.log(`  ${chalk.yellow('!')} ${result.changes.length} change${result.changes.length !== 1 ? 's' : ''} detected`);
    console.log('');
    // Group changes by type
    const changed = result.changes.filter(c => c.type === 'changed');
    const added = result.changes.filter(c => c.type === 'added');
    const removed = result.changes.filter(c => c.type === 'removed');
    for (const entry of [...changed, ...added, ...removed]) {
        printDiffEntry(entry);
    }
    console.log('');
}
function printDiffEntry(entry) {
    const label = chalk.bold(entry.field.padEnd(28));
    switch (entry.type) {
        case 'changed':
            console.log(`  ${chalk.yellow('~')} ${label}  ${chalk.red(formatVal(entry.from))} → ${chalk.green(formatVal(entry.to))}`);
            break;
        case 'added':
            console.log(`  ${chalk.green('+')} ${label}  ${chalk.green(formatVal(entry.to))}`);
            break;
        case 'removed':
            console.log(`  ${chalk.red('-')} ${label}  ${chalk.red(formatVal(entry.from))}`);
            break;
    }
}
function formatVal(v) {
    if (v === null || v === undefined)
        return 'null';
    if (typeof v === 'string' && v.length > 32)
        return v.slice(0, 32) + '…';
    return String(v);
}
//# sourceMappingURL=diff.js.map