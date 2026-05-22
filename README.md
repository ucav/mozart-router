# Mozart

**Local orchestration and routing for AI agents.**
Gateway-first, agent-first, integration-first.

Mozart detects your available gateways, providers and models, then routes each task to the best option based on cost, context, latency, privacy, quotas and reliability.

Works with OpenCode, OpenClaw, Hermes Agent, Cursor, LiteLLM, OpenRouter, Ollama and custom agent stacks.

## Why Mozart?

- **Stop choosing models manually.** Mozart classifies your task and picks the best model.
- **Stop wasting tokens.** Context optimization reduces token usage by selecting relevant content.
- **Stop leaking sensitive context.** Privacy Guard prevents secrets from being sent to cloud models.
- **Stop breaking agent workflows when providers fail.** Automatic fallback chains keep your agents running.

Mozart conducts your AI stack locally.

```
Do not rebuild what the gateway already does.
Detect it, understand it, orchestrate it.
```

## Quick start

```bash
# Install locally
npm install mozart-router

# Detect your stack
npx mozart-router doctor

# Simulate a task
npx mozart-router simulate "debug my Next.js build error"

# Route a task
npx mozart-router route "write Playwright tests"

# Explain last decision
npx mozart-router why

# Session report
npx mozart-router report

# List available skills
npx mozart-router skills
```

## Integration modes

### 1. As a skill (for OpenClaw, Hermes, OpenCode)

Copy the appropriate skill manifest from `examples/` into your agent configuration:

```bash
# For OpenCode
npx mozart-router init --gateway opencode

# For OpenClaw
npx mozart-router init --gateway openclaw

# For Hermes
npx mozart-router init --gateway hermes
```

### 2. As an SDK (in your agent code)

```typescript
import { Mozart } from 'mozart-router';

const mozart = new Mozart();

// Detect gateways and build inventory
const detection = await mozart.detectAll();

// Route a task
const route = await mozart.recommend('write a function to sort an array');
console.log(route.selectedModel);  // "deepseek/deepseek-chat"

// Full processing with privacy, cost, explanation
const response = await mozart.process({
  input: 'refactor the auth module',
  budgetMode: 'balanced',
  privacyMode: 'balanced',
  executionMode: 'recommend',
});
```

### 3. As an adapter

Mozart adapters introspect existing gateways without duplicating their functionality:

```typescript
import { OllamaAdapter, LiteLLMAdapter } from 'mozart-router';

const ollama = new OllamaAdapter();
const detection = await ollama.detect();
const models = await ollama.listModels();
```

## Architecture

```
User / Agent / IDE
        |
Mozart Interface Layer
        |
Gateway Introspection Layer → detects existing configs
        |
Provider & Model Inventory  → built from detected gateways
        |
Task Classifier             → classifies task heuristically
        |
Policy Engine               → applies user policies
        |
Privacy Guard               → scans for secrets/PII
        |
Context Optimizer           → reduces token usage
        |
Routing Engine              → scores and selects best model
        |
Execution Delegation        → delegates to existing gateway
        |
Existing Gateway            → executes the call
```

## Mozart does NOT

- Replace your gateways (LiteLLM, OpenRouter, etc.)
- Store or manage API keys that gateways already handle
- Require manual model selection
- Send data to the cloud by default
- Be an application desktop or separate dashboard
- Include mandatory telemetry

## Mozart DOES

- Detect your existing AI stack automatically
- Build an inventory from your configured gateways
- Classify tasks heuristically
- Apply privacy and budget policies
- Score and select the best model for each task
- Optimize context before sending
- Explain every routing decision
- Work in recommend-only mode
- Delegate execution to existing gateways

## Core commands

| Command | Description |
|---------|-------------|
| `mozart doctor` | Detect gateways, providers and models |
| `mozart inventory` | Show full inventory as JSON |
| `mozart simulate <task>` | Simulate routing for a task |
| `mozart route <task>` | Route a task (recommend mode) |
| `mozart why` | Explain the last routing decision |
| `mozart report` | Show session report |
| `mozart skills` | List available Mozart skills |
| `mozart init --gateway <name>` | Generate integration files |

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

## Security

- All secrets are redacted in logs
- No API keys are stored or logged
- Privacy Guard scans content before routing
- Local-only mode prevents cloud routing
- No mandatory telemetry
- All processing is local by default

## License

MIT
