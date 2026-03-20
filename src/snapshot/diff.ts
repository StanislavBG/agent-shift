import type { Snapshot, DiffResult, DiffEntry } from '../types/index.js';

/**
 * Compare two snapshots field by field.
 * Returns a structured diff result.
 */
export function diffSnapshots(source: Snapshot, target: Snapshot): DiffResult {
  const changes: DiffEntry[] = [];

  // ── Model ─────────────────────────────────────────────────────────────────
  if (source.config.model !== target.config.model) {
    changes.push({
      field: 'model',
      type: 'changed',
      from: source.config.model,
      to: target.config.model,
    });
  }

  // ── Prompts (by hash) ─────────────────────────────────────────────────────
  const allPromptKeys = new Set([
    ...Object.keys(source.promptHashes),
    ...Object.keys(target.promptHashes),
  ]);

  for (const key of allPromptKeys) {
    const fromHash = source.promptHashes[key];
    const toHash = target.promptHashes[key];

    if (!fromHash && toHash) {
      changes.push({ field: `prompts.${key}`, type: 'added', from: null, to: toHash });
    } else if (fromHash && !toHash) {
      changes.push({ field: `prompts.${key}`, type: 'removed', from: fromHash, to: null });
    } else if (fromHash !== toHash) {
      changes.push({ field: `prompts.${key}`, type: 'changed', from: fromHash, to: toHash });
    }
  }

  // ── Tools ─────────────────────────────────────────────────────────────────
  const sourceTools = new Map(source.config.tools.map(t => [t.name, t.version]));
  const targetTools = new Map(target.config.tools.map(t => [t.name, t.version]));
  const allToolNames = new Set([...sourceTools.keys(), ...targetTools.keys()]);

  for (const name of allToolNames) {
    const fromVer = sourceTools.get(name);
    const toVer = targetTools.get(name);

    if (!fromVer && toVer) {
      changes.push({ field: `tools.${name}`, type: 'added', from: null, to: toVer });
    } else if (fromVer && !toVer) {
      changes.push({ field: `tools.${name}`, type: 'removed', from: fromVer, to: null });
    } else if (fromVer !== toVer) {
      changes.push({ field: `tools.${name}`, type: 'changed', from: fromVer, to: toVer });
    }
  }

  // ── Guardrails ────────────────────────────────────────────────────────────
  const allGuardrailKeys = new Set([
    ...Object.keys(source.config.guardrails),
    ...Object.keys(target.config.guardrails),
  ]);

  for (const key of allGuardrailKeys) {
    const fromVal = source.config.guardrails[key];
    const toVal = target.config.guardrails[key];

    if (fromVal === undefined && toVal !== undefined) {
      changes.push({ field: `guardrails.${key}`, type: 'added', from: null, to: toVal });
    } else if (fromVal !== undefined && toVal === undefined) {
      changes.push({ field: `guardrails.${key}`, type: 'removed', from: fromVal, to: null });
    } else if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      changes.push({ field: `guardrails.${key}`, type: 'changed', from: fromVal, to: toVal });
    }
  }

  return {
    source: `${source.environment}@${source.id.slice(0, 8)}`,
    target: `${target.environment}@${target.id.slice(0, 8)}`,
    hasDrift: changes.length > 0,
    changes,
  };
}
