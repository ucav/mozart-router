# Limitations — Mozart v0.1.0

Mozart is honest about what it can and cannot do. This document lists all known limitations.

## Core limitations

| Area | Limitation | Why |
|------|-----------|-----|
| Context compression | Token estimation is approximate (4 chars ≈ 1 token) | Accurate tokenization requires model-specific tokenizers |
| Cost estimation | Estimates assume known pricing; returns "unknown" when pricing data is missing | Provider APIs don't always expose real-time pricing |
| Model capabilities | Defaults to 'unknown' for tools, JSON, vision unless known | Cannot test capabilities without executing against each model |
| Multi-stage routing | Works but requires manual pipeline definition per task type | Fully dynamic pipeline routing needs LLM-level planning |

## Adapter limitations

| Adapter | Limitation |
|---------|-----------|
| OpenCode | Detects installation but cannot read internal provider config (managed by OpenCode's proprietary format) |
| Hermes Agent | Stub — full interface exists but requires Hermes runtime for real detection |
| Cursor | Stub — integration depends on Cursor extension API which is not publicly documented |
| Ollama | If Ollama is not running, cannot detect models. Requires `ollama list` to work. |
| LiteLLM | Parses `litellm_config.yaml` structure but does not support all LiteLLM config variants |
| OpenRouter | Uses static curated model list; real-time model inventory would require API call |
| LM Studio / vLLM / NIM | Requires running server on expected port; cannot auto-discover non-standard ports |

## System limitations

| Area | Limitation |
|------|-----------|
| GPU/VRAM detection | Requires native Node.js addon; currently reports "not detected" |
| Session persistence | CLI invocations are stateless; each run creates a new session |
| npm publication | Not yet published to npm registry — requires `npm publish` |
| Windows paths | Some filesystem detection uses Unix-style paths; tested on Windows |

## Design decisions (not bugs)

| Decision | Rationale |
|----------|-----------|
| No API key storage | Gateways (LiteLLM, OpenRouter, etc.) already manage keys. Mozart doesn't duplicate. |
| No desktop application | Mozart is an SDK/CLI/skill, not a standalone app. |
| No mandatory cloud dependency | All core processing (classification, routing, privacy scanning) is local. |
| No official integration claims | Integrations with OpenCode, OpenClaw, Hermes, Cursor are community efforts unless otherwise stated. |
| Default recommend-only | Mozart decides; gateways execute. Execution is opt-in. |
