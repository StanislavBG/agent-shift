export interface CheckOptions {
    source: string;
    target: string;
    exitOnDrift?: boolean;
    json?: boolean;
    format?: 'sarif' | 'junit';
}
export interface CheckResult {
    passed: boolean;
    sourceEnv: string;
    targetEnv: string;
    hasDrift: boolean;
    changeCount: number;
    message: string;
}
export declare function runCheck(opts: CheckOptions): void;
//# sourceMappingURL=check.d.ts.map