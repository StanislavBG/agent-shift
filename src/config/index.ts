import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import type { AgentShiftConfig, EnvironmentConfig, ResolvedEnvironmentConfig } from '../types/index.js';

export const CONFIG_FILE = '.agent-shift.yaml';
export const STATE_DIR = '.agent-shift';

export function loadConfig(configPath?: string): AgentShiftConfig {
  const resolved = configPath
    ? path.resolve(process.cwd(), configPath)
    : path.resolve(process.cwd(), CONFIG_FILE);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Config not found: ${resolved}\nRun: agent-shift init`);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const parsed = yaml.load(raw) as AgentShiftConfig;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid .agent-shift.yaml: empty or malformed');
  }
  if (!parsed.environments || typeof parsed.environments !== 'object') {
    throw new Error('Invalid .agent-shift.yaml: missing "environments" key');
  }

  return parsed;
}

/**
 * Resolve an environment config, applying inheritance chain.
 * Cycles are detected and rejected.
 */
export function resolveEnvironment(
  config: AgentShiftConfig,
  envName: string,
  _seen: Set<string> = new Set()
): ResolvedEnvironmentConfig {
  if (_seen.has(envName)) {
    throw new Error(`Circular inheritance detected at environment: ${envName}`);
  }
  _seen.add(envName);

  const env = config.environments[envName];
  if (!env) {
    throw new Error(`Environment not found: "${envName}"\nAvailable: ${Object.keys(config.environments).join(', ')}`);
  }

  // Base defaults
  let base: ResolvedEnvironmentConfig = {
    model: '',
    prompts: {},
    tools: [],
    guardrails: {},
  };

  // Apply parent first (inheritance)
  if (env.inherits) {
    base = resolveEnvironment(config, env.inherits, _seen);
  }

  // Overlay this env's values
  const resolved: ResolvedEnvironmentConfig = {
    model: env.model ?? base.model,
    prompts: { ...base.prompts, ...(env.prompts ?? {}) },
    tools: env.tools ?? base.tools,
    guardrails: { ...base.guardrails, ...(env.guardrails ?? {}) },
  };

  if (!resolved.model) {
    throw new Error(`Environment "${envName}" has no model defined (and no parent with a model)`);
  }

  return resolved;
}

export function ensureStateDir(base?: string): string {
  const dir = path.resolve(base ?? process.cwd(), STATE_DIR);
  fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'state'), { recursive: true });
  return dir;
}

export function getStatePath(env: string, base?: string): string {
  return path.join(path.resolve(base ?? process.cwd(), STATE_DIR), 'state', `${env}.json`);
}

export function getSnapshotPath(snapshotId: string, base?: string): string {
  return path.join(path.resolve(base ?? process.cwd(), STATE_DIR), 'snapshots', `${snapshotId}.json`);
}

/** Scaffold a minimal .agent-shift.yaml in cwd */
export function scaffoldConfig(outputPath?: string): string {
  const target = outputPath
    ? path.resolve(process.cwd(), outputPath)
    : path.resolve(process.cwd(), CONFIG_FILE);

  if (fs.existsSync(target)) {
    throw new Error(`Config already exists: ${target}`);
  }

  const template = `# agent-shift configuration
# Docs: https://github.com/bilko/agent-shift
version: "1.0.0"

environments:
  staging:
    model: claude-sonnet-4-6
    prompts:
      system: ./prompts/system.md
      user_template: ./prompts/user.md
    tools:
      - name: search
        version: "1.0.0"
    guardrails:
      max_tokens: 4096
      temperature: 0.7

  production:
    inherits: staging
    model: claude-opus-4-6
    guardrails:
      max_tokens: 2048
      temperature: 0.3
`;

  fs.writeFileSync(target, template, 'utf-8');
  return target;
}
