# Roadmap

## Phase Alpha — Core (v0.1.0) ✅

All core features implemented, tested, and documented.
- [x] Core types and interfaces (28+)
- [x] CLI (14 commands)
- [x] SDK importable (full exports)
- [x] Provider/Model registry with merge, dedup, persistence
- [x] Ollama detection (real — CLI + HTTP)
- [x] LiteLLM config detection (real — YAML parsing)
- [x] OpenRouter env detection (real)
- [x] OpenCode detection (real — config + models cache reading)
- [x] OpenClaw detection (real — full openclaw.json parsing)
- [x] Hermes Agent detection (real — config file scanning)
- [x] LM Studio detection (real — HTTP)
- [x] vLLM detection (real — HTTP)
- [x] NVIDIA NIM detection (real — env + HTTP)
- [x] Generic OpenAI auto-discovery (11 endpoints)
- [x] Task classifier (19 patterns, priority scoring)
- [x] Policy engine (10 built-in profiles)
- [x] Privacy guard (6 detection types, 5 actions)
- [x] Context optimizer (4 strategies)
- [x] Cost/token estimator
- [x] Explainability engine
- [x] Routing engine (7-dimension scoring)
- [x] Fallback manager (retry, backoff, circuit breaker)
- [x] Multi-stage routing (classify → generate → review)
- [x] Local logs with secret redaction (10+ patterns)
- [x] Recommend-only mode
- [x] Delegated execution model
- [x] Skill manifests (7 skills)
- [x] Tool manifests (OpenCode, OpenClaw, Hermes, generic)
- [x] Cursor endpoint documentation
- [x] Config YAML loading (mozart.config.yaml)
- [x] Disk persistence (inventory, session, config)
- [x] Result cache (TTL, LRU eviction)
- [x] HTTP API server (8 endpoints + dashboard)
- [x] OpenAI-compatible middleware proxy (streaming SSE support)
- [x] MCP server (6 tools, stdio)
- [x] Plugin system (auto-discovery of mozart-router-adapter-*)
- [x] Metrics export (JSON + Prometheus)
- [x] Health check background (circuit breaker)
- [x] Docker support (Dockerfile + docker-compose)
- [x] CI/CD (GitHub Actions)
- [x] Tests (118 tests, 19 files)
- [x] Full documentation (12 docs)
- [x] Integration examples (7 directories with READMEs)
- [x] OpenCode SKILL.md integration

## Phase Beta — Polish (v0.2.0)

- [ ] npm publication (`npm publish`)
- [ ] DealsForge live sync (when API available)
- [ ] CanRunIt GPU detection (native addon)
- [ ] Advanced context optimizer (local LLM summarization)
- [ ] Dynamic pricing updates (live pricing API)
- [ ] Source confidence scoring improvements
- [ ] Agent workflow profiles refinement
- [ ] Provider reliability learning (ML-based trust scoring)
- [ ] Community adapters ecosystem

## Phase 1.0 — Stable

- [ ] npm package published and stable
- [ ] Demo video
- [ ] Community contributions
- [ ] Production usage reports
- [ ] Performance benchmarks
- [ ] Windows/Mac/Linux CI verified
