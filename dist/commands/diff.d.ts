export interface DiffOptions {
    source: string;
    target: string;
    config?: string;
    json?: boolean;
    format?: 'sarif' | 'junit';
}
export declare function runDiff(opts: DiffOptions): void;
//# sourceMappingURL=diff.d.ts.map