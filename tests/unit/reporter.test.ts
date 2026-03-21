import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import os from 'os';
import { formatSarif, formatJunit } from '../../src/reporter/index.js';
import type { DiffResult } from '../../src/types/index.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NO_DRIFT: DiffResult = {
  source: 'staging@abc12345',
  target: 'production@def67890',
  hasDrift: false,
  changes: [],
};

const WITH_DRIFT: DiffResult = {
  source: 'staging@abc12345',
  target: 'production@def67890',
  hasDrift: true,
  changes: [
    { field: 'model', type: 'changed', from: 'claude-sonnet-4-6', to: 'claude-opus-4-6' },
    { field: 'guardrails.max_tokens', type: 'changed', from: 4096, to: 8192 },
    { field: 'tools.search', type: 'added', from: null, to: '2.0.0' },
    { field: 'prompts.system', type: 'removed', from: 'aabbcc', to: null },
  ],
};

const UNCHANGED_ONLY: DiffResult = {
  source: 'staging@abc12345',
  target: 'production@def67890',
  hasDrift: false,
  changes: [
    { field: 'model', type: 'unchanged', from: 'claude-sonnet-4-6', to: 'claude-sonnet-4-6' },
  ],
};

// ── SARIF ─────────────────────────────────────────────────────────────────────

describe('formatSarif()', () => {
  it('produces valid JSON with SARIF 2.1.0 version', () => {
    const output = formatSarif(NO_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed.version).toBe('2.1.0');
  });

  it('sets tool.driver.name to the provided tool name', () => {
    const output = formatSarif(NO_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as { runs: Array<{ tool: { driver: { name: string } } }> };
    expect(parsed.runs[0].tool.driver.name).toBe('agent-shift');
  });

  it('returns empty results array when no drift', () => {
    const output = formatSarif(NO_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as { runs: Array<{ results: unknown[] }> };
    expect(parsed.runs[0].results).toHaveLength(0);
  });

  it('returns empty results array when only unchanged entries', () => {
    const output = formatSarif(UNCHANGED_ONLY, 'agent-shift');
    const parsed = JSON.parse(output) as { runs: Array<{ results: unknown[] }> };
    expect(parsed.runs[0].results).toHaveLength(0);
  });

  it('produces one result per actionable change', () => {
    const output = formatSarif(WITH_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as { runs: Array<{ results: unknown[] }> };
    // 4 changes: model, guardrails.max_tokens, tools.search, prompts.system
    expect(parsed.runs[0].results).toHaveLength(4);
  });

  it('assigns error level to model changes', () => {
    const output = formatSarif(WITH_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as {
      runs: Array<{ results: Array<{ ruleId: string; level: string }> }>
    };
    const modelResult = parsed.runs[0].results.find(r => r.ruleId === 'model-change');
    expect(modelResult?.level).toBe('error');
  });

  it('assigns warning level to non-model changes', () => {
    const output = formatSarif(WITH_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as {
      runs: Array<{ results: Array<{ ruleId: string; level: string }> }>
    };
    const guardrailResult = parsed.runs[0].results.find(r =>
      r.ruleId === 'config-drift',
    );
    expect(guardrailResult?.level).toBe('warning');
  });

  it('uses config-added rule for added fields', () => {
    const output = formatSarif(WITH_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as {
      runs: Array<{ results: Array<{ ruleId: string; message: { text: string } }> }>
    };
    const added = parsed.runs[0].results.find(r => r.ruleId === 'config-added');
    expect(added).toBeDefined();
    expect(added?.message.text).toContain('added');
  });

  it('uses config-removed rule for removed fields', () => {
    const output = formatSarif(WITH_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as {
      runs: Array<{ results: Array<{ ruleId: string }> }>
    };
    const removed = parsed.runs[0].results.find(r => r.ruleId === 'config-removed');
    expect(removed).toBeDefined();
  });

  it('includes rules only for change types that appear', () => {
    const onlyModel: DiffResult = {
      source: 'staging@abc12345',
      target: 'production@def67890',
      hasDrift: true,
      changes: [
        { field: 'model', type: 'changed', from: 'claude-sonnet-4-6', to: 'claude-opus-4-6' },
      ],
    };
    const output = formatSarif(onlyModel, 'agent-shift');
    const parsed = JSON.parse(output) as {
      runs: Array<{ tool: { driver: { rules: Array<{ id: string }> } } }>
    };
    expect(parsed.runs[0].tool.driver.rules).toHaveLength(1);
    expect(parsed.runs[0].tool.driver.rules[0].id).toBe('model-change');
  });

  it('includes $schema property', () => {
    const output = formatSarif(NO_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(typeof parsed.$schema).toBe('string');
    expect(parsed.$schema).toContain('sarif');
  });

  it('result message includes source and target env names', () => {
    const output = formatSarif(WITH_DRIFT, 'agent-shift');
    const parsed = JSON.parse(output) as {
      runs: Array<{ results: Array<{ message: { text: string } }> }>
    };
    const msg = parsed.runs[0].results[0].message.text;
    expect(msg).toContain('staging@abc12345');
    expect(msg).toContain('production@def67890');
  });
});

// ── JUnit XML ─────────────────────────────────────────────────────────────────

describe('formatJunit()', () => {
  it('produces XML with testsuites root element', () => {
    const output = formatJunit(NO_DRIFT);
    expect(output).toContain('<testsuites');
    expect(output).toContain('</testsuites>');
  });

  it('sets testsuites name to agent-shift', () => {
    const output = formatJunit(NO_DRIFT);
    expect(output).toContain('name="agent-shift"');
  });

  it('includes the source→target path in testsuite name', () => {
    const output = formatJunit(NO_DRIFT);
    expect(output).toContain('staging@abc12345');
    expect(output).toContain('production@def67890');
  });

  it('produces no-drift testcase when no changes', () => {
    const output = formatJunit(NO_DRIFT);
    expect(output).toContain('name="no-drift"');
    expect(output).not.toContain('<failure');
  });

  it('produces no-drift testcase when only unchanged entries', () => {
    const output = formatJunit(UNCHANGED_ONLY);
    expect(output).toContain('name="no-drift"');
    expect(output).not.toContain('<failure');
  });

  it('produces one testcase per actionable change', () => {
    const output = formatJunit(WITH_DRIFT);
    const matches = output.match(/<testcase/g);
    expect(matches).toHaveLength(4);
  });

  it('adds failure element for changed fields', () => {
    const output = formatJunit(WITH_DRIFT);
    const failures = output.match(/<failure/g);
    // model (changed), guardrails (changed), tools (added), prompts (removed) = 4 failures
    expect(failures).toHaveLength(4);
  });

  it('failure message contains field name and values', () => {
    const singleChange: DiffResult = {
      source: 'staging@abc12345',
      target: 'production@def67890',
      hasDrift: true,
      changes: [
        { field: 'guardrails.max_tokens', type: 'changed', from: 4096, to: 8192 },
      ],
    };
    const output = formatJunit(singleChange);
    expect(output).toContain('guardrails.max_tokens');
    expect(output).toContain('4096');
    expect(output).toContain('8192');
  });

  it('XML-escapes special characters in field values', () => {
    const specialChars: DiffResult = {
      source: 'staging@abc12345',
      target: 'production@def67890',
      hasDrift: true,
      changes: [
        { field: 'prompts.system', type: 'changed', from: 'You & AI', to: '<template>' },
      ],
    };
    const output = formatJunit(specialChars);
    expect(output).not.toContain('You & AI');
    expect(output).toContain('You &amp; AI');
    expect(output).not.toContain('<template>');
    expect(output).toContain('&lt;template&gt;');
  });

  it('includes failures count attribute on testsuite', () => {
    const output = formatJunit(WITH_DRIFT);
    expect(output).toMatch(/failures="4"/);
  });

  it('produces valid XML declaration', () => {
    const output = formatJunit(NO_DRIFT);
    expect(output.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('tests attribute matches number of testcases for drift result', () => {
    const output = formatJunit(WITH_DRIFT);
    expect(output).toContain('tests="4"');
  });
});

// ── --output <file> behavior ──────────────────────────────────────────────────

describe('--output file writing', () => {
  const tmpFile = resolve(os.tmpdir(), `agent-shift-test-${Date.now()}.sarif`);

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it('formatSarif output can be written to a file and read back as valid SARIF', () => {
    const sarif = formatSarif(WITH_DRIFT, 'agent-shift');
    writeFileSync(tmpFile, sarif, 'utf-8');
    const contents = readFileSync(tmpFile, 'utf-8');
    const parsed = JSON.parse(contents);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].tool.driver.name).toBe('agent-shift');
  });

  it('formatJunit output can be written to a file and read back as valid XML', () => {
    const xml = formatJunit(WITH_DRIFT);
    writeFileSync(tmpFile, xml, 'utf-8');
    const contents = readFileSync(tmpFile, 'utf-8');
    expect(contents).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(contents).toContain('<testsuites');
    expect(contents).toContain('name="agent-shift"');
  });
});
