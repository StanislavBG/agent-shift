// ── Core config schema (.agent-shift.yaml) ──────────────────────────────────

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
  prompts?: Record<string, string>; // label → file path
  tools?: ToolRef[];
  guardrails?: Guardrails;
}

export interface AgentShiftConfig {
  version: string;
  environments: Record<string, EnvironmentConfig>;
}

// ── Snapshot ─────────────────────────────────────────────────────────────────

export interface ResolvedEnvironmentConfig {
  model: string;
  prompts: Record<string, string>;  // label → file path
  tools: ToolRef[];
  guardrails: Guardrails;
}

export interface Snapshot {
  id: string;                        // sha256 of serialized resolved config + prompt hashes
  version: string;                   // semver tag from .agent-shift.yaml
  environment: string;
  timestamp: string;                 // ISO 8601
  config: ResolvedEnvironmentConfig;
  promptHashes: Record<string, string>; // label → sha256 of prompt file content
}

// ── State files (.agent-shift/) ───────────────────────────────────────────────

export interface EnvironmentState {
  environment: string;
  currentSnapshotId: string | null;
  history: string[];                 // ordered list of snapshot IDs, oldest first
}

// ── Diff ─────────────────────────────────────────────────────────────────────

export type ChangeType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffEntry {
  field: string;
  type: ChangeType;
  from: unknown;
  to: unknown;
}

export interface DiffResult {
  source: string;                    // env name or snapshot id
  target: string;
  hasDrift: boolean;
  changes: DiffEntry[];
}

// ── Gate pass receipt ─────────────────────────────────────────────────────────

export interface GatePassReceipt {
  passed: boolean;
  tool: string;
  timestamp: string;
  environment?: string;
}
