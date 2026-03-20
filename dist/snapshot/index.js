import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureStateDir, getStatePath, getSnapshotPath, } from '../config/index.js';
// ── Hashing ───────────────────────────────────────────────────────────────────
export function sha256(input) {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
/**
 * Read and hash each prompt file referenced in the config.
 * Returns record of label → sha256.
 * If a file doesn't exist, stores the hash of the error message so drift is still detectable.
 */
export function hashPromptFiles(prompts, baseDir) {
    const result = {};
    for (const [label, filePath] of Object.entries(prompts)) {
        const abs = path.resolve(baseDir, filePath);
        try {
            const content = fs.readFileSync(abs, 'utf-8');
            result[label] = sha256(content);
        }
        catch {
            result[label] = sha256(`FILE_NOT_FOUND:${abs}`);
        }
    }
    return result;
}
/**
 * Compute a stable snapshot ID from the resolved config + prompt hashes.
 * Deterministic: same input → same ID.
 */
export function computeSnapshotId(config, promptHashes) {
    const canonical = JSON.stringify({ config, promptHashes }, null, 0);
    return sha256(canonical);
}
export function createSnapshot(opts) {
    const baseDir = opts.baseDir ?? process.cwd();
    const promptHashes = hashPromptFiles(opts.config.prompts, baseDir);
    const id = computeSnapshotId(opts.config, promptHashes);
    const snapshot = {
        id,
        version: opts.version,
        environment: opts.environment,
        timestamp: new Date().toISOString(),
        config: opts.config,
        promptHashes,
    };
    return snapshot;
}
// ── Persist & load ────────────────────────────────────────────────────────────
export function saveSnapshot(snapshot, baseDir) {
    const dir = ensureStateDir(baseDir);
    const snapshotPath = getSnapshotPath(snapshot.id, baseDir);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    // Update environment state
    const statePath = getStatePath(snapshot.environment, baseDir);
    let state = {
        environment: snapshot.environment,
        currentSnapshotId: null,
        history: [],
    };
    if (fs.existsSync(statePath)) {
        state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
    // Add to history if not already present
    if (!state.history.includes(snapshot.id)) {
        state.history.push(snapshot.id);
    }
    state.currentSnapshotId = snapshot.id;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}
export function loadSnapshot(snapshotId, baseDir) {
    const snapshotPath = getSnapshotPath(snapshotId, baseDir);
    if (!fs.existsSync(snapshotPath)) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
}
export function loadEnvironmentState(env, baseDir) {
    const statePath = getStatePath(env, baseDir);
    if (!fs.existsSync(statePath))
        return null;
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}
export function loadCurrentSnapshot(env, baseDir) {
    const state = loadEnvironmentState(env, baseDir);
    if (!state?.currentSnapshotId)
        return null;
    return loadSnapshot(state.currentSnapshotId, baseDir);
}
export function loadSnapshotHistory(env, baseDir) {
    const state = loadEnvironmentState(env, baseDir);
    if (!state)
        return [];
    return state.history.map(id => loadSnapshot(id, baseDir));
}
/** Revert environment to a specific snapshot ID — updates current pointer only */
export function setCurrentSnapshot(env, snapshotId, baseDir) {
    const statePath = getStatePath(env, baseDir);
    ensureStateDir(baseDir);
    // Verify snapshot exists
    loadSnapshot(snapshotId, baseDir);
    let state = {
        environment: env,
        currentSnapshotId: snapshotId,
        history: [snapshotId],
    };
    if (fs.existsSync(statePath)) {
        const existing = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        state = { ...existing, currentSnapshotId: snapshotId };
    }
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}
//# sourceMappingURL=index.js.map