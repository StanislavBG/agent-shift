export interface PromoteOptions {
    source: string;
    to: string;
    snapshotId?: string;
    requireGatePass?: string;
    json?: boolean;
    dryRun?: boolean;
}
export interface PromoteResult {
    promoted: boolean;
    sourceEnv: string;
    targetEnv: string;
    snapshotId: string;
    version: string;
    gatePassVerified: boolean;
    dryRun: boolean;
    reason?: string;
}
export declare function runPromote(opts: PromoteOptions): void;
//# sourceMappingURL=promote.d.ts.map