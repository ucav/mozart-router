# Changelog

## v0.1.0 — Ultimate Core (2026-05-22)

### Core
- Mozart orchestrator with detectAll(), recommend(), simulate(), route(), process()
- Inventory registry with merge, dedup, snapshot, provider/model management
- Session tracker with report generation
- Disk persistence (save/load inventory, session, config)

### Routing
- Task classifier: 19 patterns, priority-based heuristic scoring
- Routing engine: 7-dimension scoring (quality, cost, latency, privacy, context, reliability, quota)
- Routing scorer with task-specific weight adjustments
- Fallback manager: retry, exponential backoff, event tracking
- Multi-stage router: classify→generate→review pipelines

### Policy & Privacy
- Policy engine with 10 built-in profiles (coding-agent, cheap-loops, privacy-first, etc.)
- YAML config loader for mozart.config.yaml
- Privacy guard: detects API keys, tokens, private keys, passwords, .env patterns
- 5 privacy actions: allow, redact, block_cloud, local_only, require_confirmation

### Context & Cost
- Context optimizer: 4 strategies (send_all, compress, truncate, select_relevant)
- Cost estimator: per-model pricing, token estimation, savings vs premium
- Result cache: TTL-based, LRU eviction, hit tracking

### Execution
- Delegated execution model (gateways execute, Mozart decides)
- OpenAI-compatible middleware proxy (`mozart proxy`)
- HTTP API server with 8 endpoints
- Recommend-only mode (default)

### Adapters — Real
- Ollama (CLI detection, model listing, execution)
- LiteLLM (config file detection, model parsing)
- OpenRouter (env detection, curated inventory)
- OpenCode (installation detection via env vars + directory)
- OpenClaw (config JSON reading, provider/model extraction)
- LM Studio (HTTP endpoint detection)
- vLLM (HTTP endpoint detection)
- NVIDIA NIM (endpoint + env detection)
- Generic OpenAI (universal auto-discovery, 11 endpoints scanned)
- Generic auto-discovery (Discovers LMS, vLLM, Ollama, LiteLLM, OpenRouter, OpenAI, Groq, Together, DeepSeek, Fireworks, Mistral)

### Adapters — Stubs
- Hermes Agent (full interface + manifest)
- Cursor (full interface + documentation)

### CLI
- 13 commands: doctor, inventory, simulate, route, why, report, skills, profiles, start, proxy, sync dealsforge, scan-local, policy, reset, init
- Auto-discovery of generic adapters on every run

### SDK
- Full TypeScript exports
- Importable modules: core, adapters, routing, policy, privacy, context, cost, explain, logs, skills, api, utils

### Skills & Tools
- 7 skill definitions: route_model, explain_route, estimate_cost, compress_context, privacy_check, fallback_plan, inventory
- Manifests: OpenCode (JSON), OpenClaw (YAML), Hermes (JSON), Generic tools (JSON)

### Documentation
- 12 docs: ARCHITECTURE, GATEWAY_FIRST_PRINCIPLES, FEATURE_MATRIX, INTEGRATIONS, ADAPTERS, SKILLS_AND_TOOLS, RECOMMEND_ONLY_MODE, DELEGATED_EXECUTION, SECURITY, LIMITATIONS, ROADMAP
- 3 reports: BUILD_REPORT, PUBLIC_REPO_VALIDATION, ULTIMATE_CORE_AUDIT
- CONTRIBUTING.md, LICENSE (MIT)

### Tests
- 102 tests across 15 test files
- Test categories: classifier, privacy, policy, routing, inventory, cost, ollama, litellm, recommend, redaction, fallback, api, cache, multistage, adapters

### Security
- Zero secrets committed
- Redactor covers 10+ secret patterns
- Privacy guard tested with all detection types
- `.env` in `.gitignore`
- SECURITY_AUDIT.md report
