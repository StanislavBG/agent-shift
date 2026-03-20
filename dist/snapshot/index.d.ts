import type { Snapshot, ResolvedEnvironmentConfig, EnvironmentState } from '../types/index.js';
export declare function sha256(input: string): string;
/**
 * Read and hash each prompt file referenced in the config.
 * Returns record of label → sha256.
 * If a file doesn't exist, stores the hash of the error message so drift is still detectable.
 */
export declare function hashPromptFiles(prompts: Record<string, string>, baseDir: string): Record<string, string>;
/**
 * Compute a stable snapshot ID from the resolved config + prompt hashes.
 * Deterministic: same input → same ID.
 */
export declare function computeSnapshotId(config: ResolvedEnvironmentConfig, promptHashes: Record<string, string>): string;
export interface CreateSnapshotOptions {
    environment: string;
    version: string;
    config: ResolvedEnvironmentConfig;
    baseDir?: string;
}
export declare function createSnapshot(opts: CreateSnapshotOptions): Snapshot;
export declare function saveSnapshot(snapshot: Snapshot, baseDir?: string): void;
export declare function loadSnapshot(snapshotId: string, baseDir?: string): Snapshot;
export declare function loadEnvironmentState(env: string, baseDir?: string): EnvironmentState | null;
export declare function loadCurrentSnapshot(env: string, baseDir?: string): Snapshot | null;
export declare function loadSnapshotHistory(env: string, baseDir?: string): Snapshot[];
/** Revert environment to a specific snapshot ID — updates current pointer only */
export declare function setCurrentSnapshot(env: string, snapshotId: string, baseDir?: string): void;
//# sourceMappingURL=index.d.ts.map