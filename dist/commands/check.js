import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { loadCurrentSnapshot } from '../snapshot/index.js';
import { diffSnapshots } from '../snapshot/diff.js';
import { formatSarif, formatJunit } from '../reporter/index.js';
import { guard } from '@preflight/license';
export function runCheck(opts) {
    // Gate paid formats immediately — before loading snapshots
    if (opts.format === 'sarif' || opts.format === 'junit') {
        guard('team', { feature: `--format ${opts.format}` });
    }
    const sourceSnapshot = loadCurrentSnapshot(opts.source);
    const targetSnapshot = loadCurrentSnapshot(opts.target);
    if (!sourceSnapshot) {
        const result = {
            passed: false,
            sourceEnv: opts.source,
            targetEnv: opts.target,
            hasDrift: false,
            changeCount: 0,
            message: `No snapshot for environment: ${opts.source}. Run: agent-shift snapshot --env ${opts.source}`,
        };
        outputResult(result, opts.json);
        process.exit(2);
    }
    if (!targetSnapshot) {
        const result = {
            passed: false,
            sourceEnv: opts.source,
            targetEnv: opts.target,
            hasDrift: false,
            changeCount: 0,
            message: `No snapshot for environment: ${opts.target}. Run: agent-shift snapshot --env ${opts.target}`,
        };
        outputResult(result, opts.json);
        process.exit(2);
    }
    const diff = diffSnapshots(sourceSnapshot, targetSnapshot);
    if (opts.format === 'sarif' || opts.format === 'junit') {
        const formatted = opts.format === 'sarif' ? formatSarif(diff, 'agent-shift') : formatJunit(diff);
        if (opts.output) {
            writeFileSync(resolve(opts.output), formatted, 'utf-8');
        }
        else {
            process.stdout.write(formatted + '\n');
        }
        if (diff.hasDrift && opts.exitOnDrift !== false)
            process.exit(1);
        return;
    }
    const passed = !diff.hasDrift;
    const result = {
        passed,
        sourceEnv: opts.source,
        targetEnv: opts.target,
        hasDrift: diff.hasDrift,
        changeCount: diff.changes.length,
        message: passed
            ? `No drift detected between ${opts.source} and ${opts.target}`
            : `${diff.changes.length} change(s) detected between ${opts.source} and ${opts.target}`,
    };
    outputResult(result, opts.json);
    if (!passed && opts.exitOnDrift !== false) {
        process.exit(1);
    }
}
function outputResult(result, json) {
    if (json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
    }
    console.log('');
    console.log(chalk.bold('  agent-shift check'));
    console.log('');
    console.log(`  ${result.sourceEnv}  →  ${result.targetEnv}`);
    console.log('');
    if (result.passed) {
        console.log(`  ${chalk.green('✓ PASS')}  ${result.message}`);
    }
    else if (!result.hasDrift && !result.passed) {
        console.log(`  ${chalk.red('✗ ERROR')}  ${result.message}`);
    }
    else {
        console.log(`  ${chalk.red('✗ FAIL')}  ${result.message}`);
        console.log('');
        console.log(chalk.dim('  Run `agent-shift diff ' + result.sourceEnv + ' ' + result.targetEnv + '` for details'));
    }
    console.log('');
}
//# sourceMappingURL=check.js.map