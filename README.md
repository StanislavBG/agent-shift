# agent-shift

> Agent config versioning with environment promotion and rollback. The deploy step in the Preflight AI agent pipeline.

```
stepproof → agent-comply → agent-gate → agent-shift DEPLOY
```

## Install

```bash
# Install from GitHub (npm package coming soon)
npm install -g github:StanislavBG/agent-shift
```

## What it does

Captures snapshots of your AI agent's configuration (prompts, model, tools, guardrails), tracks changes across environments (staging → production), enforces config integrity in CI, and gives you one-command rollback when deploys go wrong.

State lives in `.agent-shift/` (like `.terraform/`). No server, no database, no LLM calls.

## Commands

### `agent-shift init`
Scaffold a `.agent-shift.yaml` config in the current directory.

```bash
agent-shift init
```

### `agent-shift snapshot --env <environment>`
Capture the current config as a versioned snapshot with sha256 hash.

```bash
agent-shift snapshot --env staging
agent-shift snapshot --env production --tag v1.2.0
```

### `agent-shift diff <source> <target>`
Compare configs between two environments or snapshots.

```bash
agent-shift diff staging production
agent-shift diff staging production --json
```

### `agent-shift promote <source> --to <target>`
Move a validated config from one environment to another.

```bash
agent-shift promote staging --to production
agent-shift promote staging --to production --require-gate-pass ./gate-receipt.json
agent-shift promote staging --to production --dry-run
```

### `agent-shift rollback <environment>`
Revert to a prior snapshot.

```bash
agent-shift rollback production           # go back 1 step
agent-shift rollback production --steps 3
agent-shift rollback production --to abc123
agent-shift rollback production --list    # show available snapshots
```

### `agent-shift check <source> <target>`
CI/CD gate — exits 1 if config has drifted between environments.

```bash
agent-shift check staging production
```

## Config schema (`.agent-shift.yaml`)

```yaml
version: "1"
name: my-agent
environments:
  staging:
    model: claude-sonnet-4-6
    prompts:
      system: prompts/system.md
    tools:
      - name: web-search
        version: "1.0"
    guardrails:
      max_tokens: 4096
      allow_code_execution: false
  production:
    model: claude-opus-4-6
    prompts:
      system: prompts/system.md
    tools:
      - name: web-search
        version: "1.0"
    guardrails:
      max_tokens: 4096
      allow_code_execution: false
```

## CI/CD integration

```yaml
# GitHub Actions example
- name: Check agent config drift
  run: npx agent-shift check staging production

- name: Promote to production
  run: npx agent-shift promote staging --to production --require-gate-pass gate-receipt.json
```

## Preflight suite

| Tool | Role |
|------|------|
| [stepproof](https://github.com/StanislavBG/stepproof) | Regression testing |
| [agent-comply](https://github.com/StanislavBG/agent-comply) | EU AI Act compliance |
| [agent-gate](https://github.com/StanislavBG/agent-gate) | Unified readiness gate |
| **agent-shift** | **Deploy safely** |

## Contributing / build from source

```bash
git clone https://github.com/StanislavBG/agent-shift
cd agent-shift
npm install
npm run build   # compiles TypeScript to dist/
npm test        # 15 tests via vitest
```

The `dist/` directory is built at publish time via `prepublishOnly` — clone users must run `npm run build` before using the CLI locally.

## License

MIT
