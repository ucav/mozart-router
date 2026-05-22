# Feature Matrix — Mozart Ultimate Core

## Detection & Inventory

| Feature | Status | Implementation | Notes |
|---------|--------|---------------|-------|
| Gateway/tool detection | implemented | 11 adapters: Ollama, LiteLLM, OpenRouter, OpenCode, OpenClaw, Hermes, Cursor, LM Studio, vLLM, NVIDIA NIM + Generic auto-discovery | Auto-discovers 11 common endpoints |
| Provider inventory | implemented | `InventoryRegistry` — merge, dedup, source tracking | Reads from gateways, never stores raw keys |
| Model inventory | implemented | `InventoryRegistry` — per-provider, per-gateway | Includes pricing, context window, capabilities |
| Generic OpenAI auto-discovery | implemented | `GenericOpenAIAdapter` + `discoverAllGenericAdapters()` | Plug-and-play for any OpenAI-compatible endpoint |
| DealsForge sync | implemented | `syncDealsForgeData()` — curated model catalog | Static data; future: live API |
| CanRunIt local scan | implemented | `scanLocalCapability()` — CPU, RAM, OS | GPU detection needs native module |

## Classification & Routing

| Feature | Status | Implementation | Notes |
|---------|--------|---------------|-------|
| Task classifier | implemented | `TaskClassifier` — 19 patterns, priority scoring, heuristic | Local, no LLM needed |
| Routing engine | implemented | `RoutingEngine` — 7-dimension scoring (quality, cost, latency, privacy, context, reliability, quota) | Produces fallback chain |
| Multi-stage routing | implemented | `MultiStageRouter` — classify→generate→review pipelines | 4-stage for debugging, 3-stage for code gen |
| Fallback manager | implemented | `FallbackManager` — retry, exponential backoff, event tracking | Max retries configurable |
| Cost/token estimator | implemented | `CostEstimator` — per-model pricing, token estimation, savings vs premium | Declares uncertainty when price unknown |
| Explainability engine | implemented | `ExplainabilityEngine` — full text explanation per route | Why selected, why others not, privacy reasoning |

## Policy & Privacy

| Feature | Status | Implementation | Notes |
|---------|--------|---------------|-------|
| Policy engine | implemented | `PolicyEngine` — privacy, budget, routing rules | 10 built-in profiles |
| Privacy guard | implemented | `PrivacyGuard` — API keys, tokens, private keys, passwords, .env | 5 actions: allow, redact, block_cloud, local_only, require_confirmation |
| Built-in profiles | implemented | 10 profiles: coding-agent, cheap-loops, privacy-first, long-context, startup-budget, max-quality, local-first, research-agent, reviewer-agent, multi-agent | Extensible via `mozart.config.yaml` |
| YAML config loading | implemented | `loadMozartConfig()` — parses mozart.config.yaml | Optional; Mozart works without it |

## Execution Modes

| Feature | Status | Implementation | Notes |
|---------|--------|---------------|-------|
| Recommend-only mode | implemented | All routing methods return decision without executing | Default mode |
| Delegated execution | implemented | `Mozart.delegate()` — routes to gateway adapter | Only executes if adapter supports it |
| OpenAI-compatible middleware | implemented | `MozartMiddleware` — `/v1/chat/completions` with auto-routing | Transparent proxy mode |
| HTTP API | implemented | `MozartApiServer` — 8 endpoints (health, inventory, route, simulate, explain, report, compress, policy) | Local-only by default |

## Context & Cache

| Feature | Status | Implementation | Notes |
|---------|--------|---------------|-------|
| Context optimizer | implemented | `ContextOptimizer` — 4 strategies (send_all, compress, truncate, select_relevant) | Token estimation, budget-aware |
| Result cache | implemented | `ResultCache` — TTL, LRU eviction, hit tracking | In-memory, configurable size |

## Logging & Persistence

| Feature | Status | Implementation | Notes |
|---------|--------|---------------|-------|
| Local logs | implemented | `Logger` — leveled, event-based, session references | In-memory |
| Secret redaction | implemented | `Redactor` — strips API keys, tokens, passwords | 10+ patterns covered |
| Disk persistence | implemented | `saveInventory`, `loadInventory`, `saveSession`, `loadSession`, `saveConfig`, `clearAllData` | JSON files in `~/.mozart/` |

## Adapters — Real

| Adapter | Status | Detection method |
|---------|--------|-----------------|
| Ollama | implemented | CLI: `ollama --version`, `ollama list` |
| OpenClaw | implemented | File: reads `~/.openclaw/openclaw.json` |
| OpenCode | implemented | Env vars + file: checks `OPENCODE_CLIENT`, data dir |
| LiteLLM | implemented | File: scans 6 paths for `litellm_config.yaml` |
| OpenRouter | implemented | Env: checks `OPENROUTER_API_KEY` |
| LM Studio | implemented | HTTP: queries `localhost:1234/v1/models` |
| vLLM | implemented | HTTP: queries `localhost:8000/v1/models` |
| NVIDIA NIM | implemented | Env + HTTP: checks `NVIDIA_API_KEY`, local endpoint |
| Generic OpenAI | implemented | HTTP: queries any `/v1/models` endpoint. Auto-discovers 11 endpoints |

## Adapters — Stubs

| Adapter | Status | Notes |
|---------|--------|-------|
| Hermes Agent | adapter stub | Full interface + manifest at `examples/hermes/mozart-tool.json` |
| Cursor | adapter stub | Full interface, documented integration path |

## Skills & Tools

| Feature | Status | Implementation |
|---------|--------|---------------|
| mozart.route_model | implemented | `SkillDefinition` with full I/O schema |
| mozart.explain_route | implemented | `SkillDefinition` |
| mozart.estimate_cost | implemented | `SkillDefinition` |
| mozart.compress_context | implemented | `SkillDefinition` |
| mozart.privacy_check | implemented | `SkillDefinition` |
| mozart.fallback_plan | implemented | `SkillDefinition` |
| mozart.inventory | implemented | `SkillDefinition` |
| OpenCode skill manifest | implemented | `examples/opencode/mozart-skill.json` |
| OpenClaw skill manifest | implemented | `examples/openclaw/mozart-skill.yaml` |
| Hermes tool manifest | implemented | `examples/hermes/mozart-tool.json` |
| Generic tool manifests | implemented | `examples/generic-tools/` |

## Developer Experience

| Feature | Status | Implementation |
|---------|--------|---------------|
| CLI | implemented | 13 commands |
| SDK | implemented | Full TypeScript exports |
| Tests | implemented | 102 tests, 15 files, Vitest |
| Docs | implemented | 12 docs files |
| Examples | implemented | 7 example directories |
| CI/Lint | implemented | `tsc --noEmit` |

---

**Status key:**
- **implemented** — Fully coded, tested, functional
- **partially implemented** — Core logic exists, some edges incomplete
- **adapter stub** — Full interface exists, requires target environment
- **documented** — Design docs exist, not yet coded
- **planned** — On roadmap, not yet started
