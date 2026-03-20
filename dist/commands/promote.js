import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import { loadCurrentSnapshot, saveSnapshot, loadSnapshot } from '../snapshot/index.js';
import { diffSnapshots } from '../snapshot/diff.js';
export function runPromote(opts) {
    // Load source snapshot
    let source;
    if (opts.snapshotId) {
        try {
            source = loadSnapshot(opts.snapshotId);
        }
        catch (e) {
            console.error(chalk.red(`✗ ${e.message}`));
            process.exit(2);
        }
    }
    else {
        source = loadCurrentSnapshot(opts.source);
        if (!source) {
            console.error(chalk.red(`✗ No snapshot found for environment: ${opts.source}`));
            console.error(chalk.dim(`  Run: agent-shift snapshot --env ${opts.source}`));
            process.exit(2);
        }
    }
    // Check gate pass if required
    let gatePassVerified = false;
    if (opts.requireGatePass) {
        const receiptPath = path.resolve(process.cwd(), opts.requireGatePass);
        if (!fs.existsSync(receiptPath)) {
            const result = {
                promoted: false,
                sourceEnv: opts.source,
                targetEnv: opts.to,
                snapshotId: source.id,
                version: source.version,
                gatePassVerified: false,
                dryRun: opts.dryRun ?? false,
                reason: `Gate pass receipt not found: ${receiptPath}`,
            };
            outputResult(result, opts.json);
            process.exit(1);
        }
        let receipt;
        try {
            receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
        }
        catch {
            console.error(chalk.red(`✗ Could not parse gate pass receipt: ${receiptPath}`));
            process.exit(2);
        }
        if (!receipt.passed) {
            const result = {
                promoted: false,
                sourceEnv: opts.source,
                targetEnv: opts.to,
                snapshotId: source.id,
                version: source.version,
                gatePassVerified: false,
                dryRun: opts.dryRun ?? false,
                reason: `Gate pass receipt shows FAILED (tool: ${receipt.tool}, timestamp: ${receipt.timestamp})`,
            };
            outputResult(result, opts.json);
            process.exit(1);
        }
        gatePassVerified = true;
    }
    // Compute diff for informational output
    const currentTarget = loadCurrentSnapshot(opts.to);
    const hasDiff = currentTarget ? diffSnapshots(source, currentTarget).hasDrift : true;
    if (opts.dryRun) {
        const result = {
            promoted: false,
            sourceEnv: opts.source,
            targetEnv: opts.to,
            snapshotId: source.id,
            version: source.version,
            gatePassVerified,
            dryRun: true,
        };
        outputResult(result, opts.json);
        return;
    }
    // Promote: copy snapshot to target environment and save
    const promoted = {
        ...source,
        environment: opts.to,
        timestamp: new Date().toISOString(),
    };
    saveSnapshot(promoted);
    const result = {
        promoted: true,
        sourceEnv: opts.source,
        targetEnv: opts.to,
        snapshotId: promoted.id,
        version: promoted.version,
        gatePassVerified,
        dryRun: false,
    };
    outputResult(result, opts.json);
}
function outputResult(result, json) {
    if (json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
    }
    console.log('');
    console.log(chalk.bold('  agent-shift promote'));
    console.log('');
    if (result.dryRun) {
        console.log(`  ${chalk.cyan('i')} DRY RUN — no changes written`);
        console.log(`  Source       ${chalk.cyan(result.sourceEnv)}`);
        console.log(`  Target       ${chalk.cyan(result.targetEnv)}`);
        console.log(`  Snapshot     ${result.snapshotId.slice(0, 16)}...`);
        console.log(`  Gate pass    ${result.gatePassVerified ? chalk.green('verified') : chalk.dim('not required')}`);
        console.log('');
        return;
    }
    if (!result.promoted) {
        console.log(`  ${chalk.red('✗')} Promotion blocked`);
        if (result.reason) {
            console.log(`  Reason       ${chalk.red(result.reason)}`);
        }
        console.log('');
        return;
    }
    console.log(`  ${chalk.green('✓')} Promoted`);
    console.log(`  ${result.sourceEnv} → ${chalk.cyan(result.targetEnv)}`);
    console.log(`  Snapshot     ${result.snapshotId.slice(0, 16)}...`);
    console.log(`  Version      ${result.version}`);
    console.log(`  Gate pass    ${result.gatePassVerified ? chalk.green('verified') : chalk.dim('not required')}`);
    console.log('');
}
//# sourceMappingURL=promote.js.map