export interface ToolRef {
    name: string;
    version: string;
}
export interface Guardrails {
    max_tokens?: number;
    temperature?: number;
    [key: string]: unknown;
}
export interface EnvironmentConfig {
    inherits?: string;
    model: string;
    prompts?: Record<string, string>;
    tools?: ToolRef[];
    guardrails?: Guardrails;
}
export interface AgentShiftConfig {
    version: string;
    environments: Record<string, EnvironmentConfig>;
}
export interface ResolvedEnvironmentConfig {
    model: string;
    prompts: Record<string, string>;
    tools: ToolRef[];
    guardrails: Guardrails;
}
export interface Snapshot {
    id: string;
    version: string;
    environment: string;
    timestamp: string;
    config: ResolvedEnvironmentConfig;
    promptHashes: Record<string, string>;
}
export interface EnvironmentState {
    environment: string;
    currentSnapshotId: string | null;
    history: string[];
}
export type ChangeType = 'added' | 'removed' | 'changed' | 'unchanged';
export interface DiffEntry {
    field: string;
    type: ChangeType;
    from: unknown;
    to: unknown;
}
export interface DiffResult {
    source: string;
    target: string;
    hasDrift: boolean;
    changes: DiffEntry[];
}
export interface GatePassReceipt {
    passed: boolean;
    tool: string;
    timestamp: string;
    environment?: string;
}
//# sourceMappingURL=index.d.ts.map