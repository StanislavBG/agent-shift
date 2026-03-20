import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  sha256,
  hashPromptFiles,
  computeSnapshotId,
  createSnapshot,
  saveSnapshot,
  loadSnapshot,
  loadCurrentSnapshot,
  loadSnapshotHistory,
  setCurrentSnapshot,
} from '../../src/snapshot/index.js';
import type { ResolvedEnvironmentConfig } from '../../src/types/index.js';

const SAMPLE_CONFIG: ResolvedEnvironmentConfig = {
  model: 'claude-sonnet-4-6',
  prompts: {},
  tools: [{ name: 'search', version: '1.0.0' }],
  guardrails: { max_tokens: 4096, temperature: 0.7 },
};

describe('sha256', () => {
  it('hashes a string deterministically', () => {
    const h1 = sha256('hello');
    const h2 = sha256('hello');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('produces different hashes for different inputs', () => {
    expect(sha256('hello')).not.toBe(sha256('world'));
  });
});

describe('hashPromptFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shift-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns sha256 of file content', () => {
    const promptPath = path.join(tmpDir, 'system.md');
    fs.writeFileSync(promptPath, 'You are an AI assistant.');

    const hashes = hashPromptFiles({ system: promptPath }, tmpDir);
    expect(hashes.system).toBe(sha256('You are an AI assistant.'));
  });

  it('returns hash of error marker when file is missing', () => {
    const hashes = hashPromptFiles({ system: '/nonexistent/file.md' }, tmpDir);
    expect(hashes.system).toMatch(/^[a-f0-9]{64}$/);
    expect(hashes.system).toBe(sha256('FILE_NOT_FOUND:/nonexistent/file.md'));
  });

  it('returns empty object for empty prompts', () => {
    expect(hashPromptFiles({}, tmpDir)).toEqual({});
  });
});

describe('computeSnapshotId', () => {
  it('is deterministic for same input', () => {
    const hashes = { system: sha256('hello') };
    const id1 = computeSnapshotId(SAMPLE_CONFIG, hashes);
    const id2 = computeSnapshotId(SAMPLE_CONFIG, hashes);
    expect(id1).toBe(id2);
  });

  it('changes when model changes', () => {
    const config2 = { ...SAMPLE_CONFIG, model: 'claude-opus-4-6' };
    const id1 = computeSnapshotId(SAMPLE_CONFIG, {});
    const id2 = computeSnapshotId(config2, {});
    expect(id1).not.toBe(id2);
  });

  it('changes when prompt hash changes', () => {
    const id1 = computeSnapshotId(SAMPLE_CONFIG, { system: 'aaa' });
    const id2 = computeSnapshotId(SAMPLE_CONFIG, { system: 'bbb' });
    expect(id1).not.toBe(id2);
  });
});

describe('createSnapshot', () => {
  it('builds a snapshot with the correct structure', () => {
    const snap = createSnapshot({
      environment: 'staging',
      version: '1.0.0',
      config: SAMPLE_CONFIG,
      baseDir: '/tmp',
    });

    expect(snap.environment).toBe('staging');
    expect(snap.version).toBe('1.0.0');
    expect(snap.config).toEqual(SAMPLE_CONFIG);
    expect(snap.id).toHaveLength(64);
    expect(snap.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('saveSnapshot / loadSnapshot / state', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-shift-state-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and reloads a snapshot', () => {
    const snap = createSnapshot({
      environment: 'staging',
      version: '1.0.0',
      config: SAMPLE_CONFIG,
    });

    saveSnapshot(snap, tmpDir);

    const loaded = loadSnapshot(snap.id, tmpDir);
    expect(loaded.id).toBe(snap.id);
    expect(loaded.config.model).toBe(SAMPLE_CONFIG.model);
  });

  it('loadCurrentSnapshot returns null when no state exists', () => {
    expect(loadCurrentSnapshot('staging', tmpDir)).toBeNull();
  });

  it('loadCurrentSnapshot returns most recent snapshot after save', () => {
    const snap = createSnapshot({
      environment: 'staging',
      version: '1.0.0',
      config: SAMPLE_CONFIG,
    });
    saveSnapshot(snap, tmpDir);

    const current = loadCurrentSnapshot('staging', tmpDir);
    expect(current?.id).toBe(snap.id);
  });

  it('loadSnapshotHistory returns all saved snapshots in order', () => {
    const snap1 = createSnapshot({ environment: 'staging', version: '1.0.0', config: SAMPLE_CONFIG });
    const snap2 = createSnapshot({ environment: 'staging', version: '1.1.0', config: { ...SAMPLE_CONFIG, model: 'claude-opus-4-6' } });

    saveSnapshot(snap1, tmpDir);
    saveSnapshot(snap2, tmpDir);

    const history = loadSnapshotHistory('staging', tmpDir);
    // Deduplicated IDs — both distinct
    const ids = history.map(s => s.id);
    expect(ids).toContain(snap1.id);
    expect(ids).toContain(snap2.id);
  });

  it('setCurrentSnapshot updates the current pointer', () => {
    const snap1 = createSnapshot({ environment: 'staging', version: '1.0.0', config: SAMPLE_CONFIG });
    const snap2 = createSnapshot({ environment: 'staging', version: '1.1.0', config: { ...SAMPLE_CONFIG, model: 'claude-opus-4-6' } });

    saveSnapshot(snap1, tmpDir);
    saveSnapshot(snap2, tmpDir);

    setCurrentSnapshot('staging', snap1.id, tmpDir);

    const current = loadCurrentSnapshot('staging', tmpDir);
    expect(current?.id).toBe(snap1.id);
  });

  it('throws when loading a non-existent snapshot', () => {
    expect(() => loadSnapshot('nonexistent-id', tmpDir)).toThrow('Snapshot not found');
  });
});
