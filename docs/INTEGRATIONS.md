# Integrations

Mozart integrates with multiple AI gateways, agents, and tools. Each integration follows the gateway-first principle: Mozart adds intelligence without duplicating functionality.

## Integration modes

### 1. Adapter mode (for gateways)
Mozart ships with adapters that detect and read from existing gateway configurations.

### 2. Skill mode (for agent tools)
Mozart exposes skills (route_model, estimate_cost, privacy_check, etc.) that agents can call.

### 3. Tool mode (for agent frameworks)
Mozart can be called as a tool within OpenClaw, Hermes, or custom agents.

### 4. Middleware mode (for pipelines)
Mozart can sit between an agent and its gateway, injecting routing decisions.

### 5. Recommend-only mode (universal)
Mozart can function in pure advisory mode, generating recommendations without execution.

## Supported integrations

### OpenCode
**Status:** Adapter stub + manifest available

Mozart provides:
- `examples/opencode/mozart-skill.json` — skill manifest
- Config detection for OpenCode provider configurations
- Routing recommendations for coding tasks

### OpenClaw
**Status:** Adapter stub + manifest available

Mozart provides:
- `examples/openclaw/mozart-skill.yaml` — skill definition
- Skills: route_model, estimate_cost, compress_context
- Multi-agent workflow support

### Hermes Agent
**Status:** Adapter stub + manifest available

Mozart provides:
- `examples/hermes/mozart-tool.json` — tool definition
- Provider decision layer
- Policy enforcement for agentic workflows

### LiteLLM
**Status:** Real adapter with config detection

Mozart detects:
- `litellm_config.yaml` / `litellm_config.yml` in common locations
- Parses model entries from config
- Delegates execution to LiteLLM proxy

### OpenRouter
**Status:** Real adapter with env detection

Mozart detects:
- `OPENROUTER_API_KEY`, `OR_API_KEY`, `OPENROUTER_KEY` in environment
- Provides curated model inventory with pricing data
- Routes via OpenRouter for cloud models

### Ollama
**Status:** Real adapter with CLI detection

Mozart detects:
- Ollama installation via `ollama --version`
- Local models via `ollama list`
- Provides execution target for local inference

### Cursor
**Status:** Adapter stub + documentation

Mozart can be used as:
- Advisory layer via CLI/SDK
- Local endpoint for model selection
- Context optimization for IDE usage

## Adding a new integration

1. Create a new adapter in `src/adapters/` implementing the `GatewayAdapter` interface
2. Register in `src/adapters/index.ts`
3. Add a manifest in `examples/<name>/`
4. Add documentation in `docs/INTEGRATIONS.md`
5. Write tests in `tests/<name>.test.ts`
