# Mozart

[![CI](https://github.com/ucav/mozart-router/actions/workflows/ci.yml/badge.svg)](https://github.com/ucav/mozart-router/actions)
[![Tests](https://img.shields.io/badge/tests-118%20passed-brightgreen)](https://github.com/ucav/mozart-router)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/ucav/mozart-router)

**Mozart is the local conductor for AI agents** — a gateway-aware routing and orchestration layer that integrates as a skill, tool, adapter or middleware into your existing AI stack.

Mozart detects your available gateways, providers and models, then routes each task to the best option based on cost, context, latency, privacy, quotas and reliability.

```
Gateways execute. Mozart decides.

Do not rebuild what the gateway already does.
Detect it, understand it, orchestrate it.
```

## Why Mozart?

- **Stop choosing models manually.** Mozart classifies your task and picks the best model.
- **Stop wasting tokens.** Context optimization reduces token usage.
- **Stop leaking sensitive context.** Privacy Guard prevents secrets from being sent to cloud models.
- **Stop breaking agent workflows when providers fail.** Automatic fallback chains keep your agents running.
- **Understand every decision.** Every route comes with a full explanation — why this model, why not the others.

## What Mozart is

- A **skill** callable by OpenClaw, OpenCode, Hermes or custom agents
- A **tool** that agents can invoke for routing decisions
- An **adapter** that reads existing gateway configs without duplicating them
- A **middleware** you can insert between your agent and its gateway
- A **local SDK** you import into your own TypeScript/Node.js projects
- A **CLI** for diagnostics, simulation, and reporting

## What Mozart is NOT

- Not a desktop application or separate dashboard
- Not a replacement for LiteLLM, OpenRouter, or your existing gateways
- Not a tool that asks you to re-enter all your API keys
- Not a system that stores or manages keys that gateways already handle

## Quick start

```bash
git clone https://github.com/ucav/mozart-router.git
cd mozart-router
npm install
npm run build

# Integration-first — detect your existing stack
npx mozart-router init --gateway opencode
npx mozart-router init --gateway openclaw
npx mozart-router init --gateway hermes

# Discover what's already available
npx mozart-router doctor

# See your full inventory
npx mozart-router inventory

# Simulate routing before executing
npx mozart-router simulate "debug my Next.js build error"

# Route a task (recommend-only by default)
npx mozart-router route "write Playwright tests"

# Understand the decision
npx mozart-router why

# Session report
npx mozart-router report

# List available Mozart skills for your agents
npx mozart-router skills
```

> Note: until published to npm, use `npm run mozart -- <command>` for local development. The `npx mozart-router` commands will work after `npm publish`.

## Integration modes

### 1. Skill mode — for OpenClaw, OpenCode, Hermes

Copy the skill manifest from `examples/` into your agent:

```bash
npx mozart-router init --gateway opencode    # → examples/opencode/mozart-skill.json
npx mozart-router init --gateway openclaw    # → examples/openclaw/mozart-skill.yaml
npx mozart-router init --gateway hermes      # → examples/hermes/mozart-tool.json
```

### 2. SDK mode — import into your agent code

```typescript
import { Mozart, OllamaAdapter, OpenRouterAdapter, OpenClawAdapter } from 'mozart-router';

const mozart = new Mozart();

// Register adapters — Mozart auto-detects each gateway
mozart.registry.registerAdapter(new OllamaAdapter());
mozart.registry.registerAdapter(new OpenRouterAdapter());
mozart.registry.registerAdapter(new OpenClawAdapter());

// Discover all gateways
await mozart.detectAll();

// Route a task
const route = await mozart.recommend('write a function to sort an array');
console.log(route.selectedModel); // e.g. "qwen3:8b"

// Full processing with privacy, cost, explanation
const response = await mozart.process({
  input: 'refactor the auth module',
  budgetMode: 'balanced',
  privacyMode: 'balanced',
  executionMode: 'recommend',
});
```

### 3. Adapter mode — introspect any gateway

```typescript
import { OllamaAdapter } from 'mozart-router';

const ollama = new OllamaAdapter();
const detection = await ollama.detect();
const models = await ollama.listModels();
// Build inventory without touching API keys
```

### 4. Middleware mode — OpenAI-compatible proxy

```bash
npm run mozart -- proxy --port=4445
# Point your agent to http://127.0.0.1:4445/v1
# Mozart routes every chat completion to the best model
```

### 5. Recommend-only mode — advisory without execution

```typescript
const recommendation = await mozart.recommend('security audit payment module');
// Returns: selected model, confidence, cost estimate, explanation
// No execution — your existing gateway handles the actual call
```

## Architecture

```
User / Agent / IDE
        |
Mozart Interface (CLI · SDK · Skills · API · Middleware)
        |
Gateway Introspection Layer → detects existing configs non-destructively
        |
Provider & Model Inventory  → built from detected gateways
        |
Task Classifier             → heuristic, local, no LLM needed
        |
Policy Engine               → privacy, budget, routing rules
        |
Privacy Guard               → scans for secrets, blocks cloud leaks
        |
Context Optimizer           → reduces token waste
        |
Routing Engine              → 7-dimension scoring per model
        |
Explainability              → every decision explained
        |
Execution Delegation        → delegates to existing gateway
        |
Existing Gateway            → LiteLLM · OpenRouter · Ollama · ...
```

## Feature matrix

See [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md) for the complete status of every module.

## Core commands

| Command | Description |
|---------|-------------|
| `mozart doctor` | Detect gateways, providers and models |
| `mozart inventory` | Show full inventory as JSON |
| `mozart simulate <task>` | Simulate routing for a task |
| `mozart route <task>` | Route a task (recommend-only) |
| `mozart why` | Explain the last routing decision |
| `mozart report` | Show session report |
| `mozart skills` | List available Mozart skills |
| `mozart profiles` | List built-in policy profiles |
| `mozart policy list` | List available policy profiles |
| `mozart start [--port=4444]` | Start local HTTP API + dashboard |
| `mozart stream [--port=4445]` | Start streaming middleware (SSE) |
| `mozart proxy [--port=4445]` | Start OpenAI-compatible middleware |
| `mozart mcp` | Start MCP server (stdlib) |
| `mozart config init` | Interactive config generator |
| `mozart plugins` | List registered plugins |
| `mozart metrics` | Export metrics (JSON + Prometheus) |
| `mozart health` | Health check all adapters |
| `mozart scan-local` | Scan local hardware capabilities |
| `mozart sync dealsforge` | Load DealsForge provider intelligence |
| `mozart init --gateway <name>` | Generate integration files |
| `mozart reset` | Clear all local data |

## Skills

Mozart exposes these skills for agents:

| Skill | Description |
|-------|-------------|
| `mozart.route_model` | Choose best model/provider for a task |
| `mozart.explain_route` | Explain why a model was chosen |
| `mozart.estimate_cost` | Estimate cost before execution |
| `mozart.compress_context` | Optimize context for token savings |
| `mozart.privacy_check` | Scan content for secrets |
| `mozart.fallback_plan` | Generate fallback execution plan |
| `mozart.inventory` | Return current inventory |

## Documentation

| Document | Content |
|----------|---------|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design and module dependencies |
| [GATEWAY_FIRST_PRINCIPLES](docs/GATEWAY_FIRST_PRINCIPLES.md) | Why Mozart doesn't replace gateways |
| [FEATURE_MATRIX](docs/FEATURE_MATRIX.md) | Complete feature status |
| [INTEGRATIONS](docs/INTEGRATIONS.md) | Supported gateways and agents |
| [ADAPTERS](docs/ADAPTERS.md) | Adapter reference and how to create new ones |
| [SKILLS_AND_TOOLS](docs/SKILLS_AND_TOOLS.md) | Skill/tool manifest reference |
| [RECOMMEND_ONLY_MODE](docs/RECOMMEND_ONLY_MODE.md) | How Mozart works without execution |
| [SECURITY](docs/SECURITY.md) | Security design and privacy guard |
| [LIMITATIONS](docs/LIMITATIONS.md) | Honest limits and constraints |
| [ROADMAP](docs/ROADMAP.md) | Development plans |

## Security

- All secrets are redacted in logs (see [SECURITY](docs/SECURITY.md))
- No API keys are stored or logged
- Privacy Guard scans content before routing
- Local-only mode prevents cloud routing
- No mandatory telemetry
- All processing is local by default
- See [reports/SECURITY_AUDIT.md](reports/SECURITY_AUDIT.md) for full audit

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT — see [LICENSE](LICENSE)
