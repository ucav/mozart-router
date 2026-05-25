# 🎻 Mozart

> **Mozart is the local conductor for AI agents.**
> Gateways execute. Mozart decides.

[![CI](https://github.com/ucav/mozart-router/actions/workflows/ci.yml/badge.svg)](https://github.com/ucav/mozart-router/actions)
[![npm](https://img.shields.io/npm/v/mozart-router)](https://www.npmjs.com/package/mozart-router)
[![Tests](https://img.shields.io/badge/tests-149%20passed-brightgreen)](https://github.com/ucav/mozart-router)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

<p align="center">
  <img src="demo.gif" alt="Mozart demo" width="800">
</p>

---

## What problem does Mozart solve?

You have Ollama, OpenRouter, LiteLLM, OpenCode, OpenClaw... multiple gateways, multiple models. Every time you ask your agent to do something, **you have to guess which model to use**. Cheap one for simple stuff? Premium for complex? Local for sensitive files?

**Mozart decides for you.** It detects every gateway and model you already have, classifies your task, scans for secrets, estimates cost, and routes to the best model — automatically.

```
Before Mozart:  "Hmm, should I use GPT-4 or Llama for this? Is there a secret in this file?"
After Mozart:   "Just ask. Mozart handles it."
```

---

## ⚡ Quick Install

```bash
npm install -g mozart-router
mozart-router doctor
```

That's it. Mozart finds everything you already have configured.

---

## 🎯 What Mozart does

| Capability | How |
|------------|-----|
| 🔍 **Auto-detect** | Finds Ollama, OpenClaw, OpenCode, LiteLLM, OpenRouter, LM Studio, vLLM, NIM — plus 11 endpoints via auto-discovery |
| 🧠 **Classify tasks** | Heuristic classifier: debugging, code gen, refactor, security audit, test writing... |
| 🛡️ **Protect secrets** | Scans content for API keys, tokens, .env files. Blocks cloud routing when sensitive. |
| 📊 **Route intelligently** | Scores models on quality, cost, latency, privacy, context, reliability. Returns full explanation. |
| 💰 **Estimate cost** | Per-model pricing. Live prices from OpenRouter (357 models). |
| 🔄 **Fallback chains** | Automatic retry with exponential backoff. Circuit breaker on failing providers. |
| 📝 **Explain everything** | Every route decision comes with a "why" — why this model, why not the others. |
| 🏠 **100% local** | No cloud dependency. Classification, privacy scanning, routing — all local. |

---

## 🚀 30-Second Demo

```bash
# See what's on your machine
mozart-router doctor

# Simulate routing for a task
mozart-router simulate "debug my Next.js build error"

# Route a real task
mozart-router route "write Playwright tests for the login page"

# Understand the decision
mozart-router why

# Session report
mozart-router report

# See the dashboard
mozart-router start --port=4444
# Open http://localhost:4444
```

---

## 🔌 Integration modes

Mozart works however you need it to:

```bash
# As a CLI tool
mozart-router doctor

# As an SDK in your agent code
import { Mozart } from 'mozart-router'

# As a skill for OpenCode / OpenClaw / Hermes
mozart-router init --gateway opencode

# As an MCP server (Claude Desktop, Cursor, Continue.dev)
mozart-router mcp

# As an OpenAI-compatible proxy
mozart-router proxy --port=4445

# As a streaming middleware (SSE)
mozart-router stream --port=4445
```

---

## 📦 Supported Gateways

| Gateway | Detection | Status |
|---------|-----------|--------|
| Ollama | `ollama list` | ✅ Real |
| OpenClaw | Reads `~/.openclaw/openclaw.json` | ✅ Real |
| OpenCode | Env vars + models cache | ✅ Real |
| LiteLLM | Scans `litellm_config.yaml` | ✅ Real |
| OpenRouter | `OPENROUTER_API_KEY` env | ✅ Real |
| LM Studio | `GET /v1/models` on localhost:1234 | ✅ Real |
| vLLM | `GET /v1/models` on localhost:8000 | ✅ Real |
| NVIDIA NIM | Local endpoint + env | ✅ Real |
| Generic OpenAI | Auto-discovers 11 endpoints | ✅ Real |
| Hermes Agent | Config file detection | ✅ Real |
| Cursor | Integration docs | 📋 Stub |

---

## 🧭 How routing works

```
Your task → "debug the authentication error"
                ↓
         Task Classifier → debugging, high complexity, very_high context
                ↓
         Privacy Guard  → scans for secrets, API keys
                ↓
         Policy Engine  → your budget, privacy preferences
                ↓
         Routing Engine → scores all available models on 7 dimensions
                ↓
         Output         → "qwen3:8b via OpenClaw (score 0.92, cost $0)"
                           + fallback chain
                           + full explanation
```

---

## 📊 Commands

| Command | Description |
|---------|-------------|
| `doctor` | Detect all gateways and models |
| `simulate <task>` | Simulate routing without executing |
| `route <task>` | Route and explain |
| `why` | Explain last decision |
| `report` | Session statistics |
| `start [--port=4444]` | HTTP API + dashboard |
| `proxy [--port=4445]` | OpenAI-compatible middleware |
| `stream [--port=4445]` | Streaming SSE middleware |
| `mcp` | MCP server (stdio) |
| `skills` | List Mozart skills |
| `profiles` | List policy profiles |
| `pricing sync` | Fetch live OpenRouter prices |
| `scan-local` | Scan local hardware |
| `health` | Provider health check |
| `config init` | Interactive setup wizard |

---

## 📚 Docs

| Doc | Content |
|-----|---------|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design |
| [GATEWAY_FIRST](docs/GATEWAY_FIRST_PRINCIPLES.md) | Why Mozart doesn't replace gateways |
| [FEATURE_MATRIX](docs/FEATURE_MATRIX.md) | Complete feature status |
| [INTEGRATIONS](docs/INTEGRATIONS.md) | Gateway/agent setup guides |
| [ADAPTERS](docs/ADAPTERS.md) | Adapter reference |
| [SECURITY](docs/SECURITY.md) | Privacy guard + redaction |
| [LIMITATIONS](docs/LIMITATIONS.md) | Honest limits |

---

<div align="center">
  <sub>Built by <a href="https://github.com/ucav">Ucav</a> · MIT License · <a href="CONTRIBUTING.md">Contribute</a></sub>
</div>
