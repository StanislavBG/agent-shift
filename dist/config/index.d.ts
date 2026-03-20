import type { AgentShiftConfig, ResolvedEnvironmentConfig } from '../types/index.js';
export declare const CONFIG_FILE = ".agent-shift.yaml";
export declare const STATE_DIR = ".agent-shift";
export declare function loadConfig(configPath?: string): AgentShiftConfig;
/**
 * Resolve an environment config, applying inheritance chain.
 * Cycles are detected and rejected.
 */
export declare function resolveEnvironment(config: AgentShiftConfig, envName: string, _seen?: Set<string>): ResolvedEnvironmentConfig;
export declare function ensureStateDir(base?: string): string;
export declare function getStatePath(env: string, base?: string): string;
export declare function getSnapshotPath(snapshotId: string, base?: string): string;
/** Scaffold a minimal .agent-shift.yaml in cwd */
export declare function scaffoldConfig(outputPath?: string): string;
//# sourceMappingURL=index.d.ts.map