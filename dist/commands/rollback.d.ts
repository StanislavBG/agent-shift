export interface RollbackOptions {
    env: string;
    to?: string;
    steps?: number;
    list?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function runRollback(opts: RollbackOptions): void;
//# sourceMappingURL=rollback.d.ts.map