# Architecture

## High-level design

Mozart is designed as a **gateway-first orchestration layer**. It does not replace gateways — it sits between agents and gateways adding decision intelligence.

```
┌──────────────────────────────────────────────────┐
│                  Agent / IDE / User               │
├──────────────────────────────────────────────────┤
│              Mozart Interface Layer               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │   SDK    │ │   CLI    │ │  Skill/Tool API   │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────┤
│         Gateway Introspection Layer               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │Ollama  │ │LiteLLM │ │OpenRt │ │Agent De-  │  │
│  │Adapter │ │Adapter │ │Adapter│ │tectors    │  │
│  └────────┘ └────────┘ └────────┘ └──────────┘  │
├──────────────────────────────────────────────────┤
│           Mozart Core Engine                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Inventory │ │  Policy  │ │  Privacy Guard   │  │
│  │Registry  │ │  Engine  │ │                  │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Task     │ │ Routing  │ │   Context        │  │
│  │Classifier│ │ Engine   │ │   Optimizer      │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Cost    │ │Explain-  │ │   Logger +       │  │
│  │Estimator │ │ability   │ │   Redactor       │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────┤
│          Execution Delegation Layer               │
│  ┌──────────────────────────────────────────────┐ │
│  │  Delegates to: LiteLLM / OpenRouter /        │ │
│  │  Ollama / Direct Provider / Agent Tool       │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Design principles

### 1. Gateway-first
Mozart never rebuilds what a gateway already does. It detects, understands, and orchestrates existing infrastructure.

### 2. Agent-first
Mozart integrates as a skill, tool, or adapter within existing agent frameworks — never as a separate application.

### 3. Integration-first
Every module is designed to be importable as a TypeScript SDK, not locked behind a UI or service boundary.

### 4. Local-first
All processing (classification, privacy scanning, routing, logging) happens locally. No cloud dependency for core functionality.

### 5. Privacy by default
Secrets are never logged. Privacy guard scans all content before routing. Local-only mode available.

### 6. Modular
Every component is independently usable. You can use just the Privacy Guard, just the Router, or the full orchestrator.

## Module dependencies

```
types/ (zero dependencies)
  |
  ├─ core/
  │   ├─ inventory.ts (types)
  │   ├─ session.ts (types)
  │   └─ mozart.ts (all modules)
  |
  ├─ adapters/ (types, core/inventory)
  │   ├─ ollama.ts
  │   ├─ litellm.ts
  │   ├─ openrouter.ts
  │   ├─ opencode.ts
  │   ├─ openclaw.ts
  │   ├─ hermes.ts
  │   └─ cursor.ts
  |
  ├─ routing/
  │   ├─ classifier.ts (types)
  │   ├─ scorer.ts (types)
  │   └─ router.ts (types, core/inventory, policy, cost)
  |
  ├─ policy/engine.ts (types)
  ├─ privacy/guard.ts (types, logs)
  ├─ context/optimizer.ts (types)
  ├─ cost/estimator.ts (types)
  ├─ explain/engine.ts (types)
  |
  ├─ logs/
  │   ├─ logger.ts (types)
  │   └─ redactor.ts
  |
  ├─ skills/definitions.ts (types)
  └─ cli/main.ts (all modules)
```

## Data flow

```
User Input → Task Classifier → Task Profile
           → Privacy Guard → Privacy Decision
           → Policy Engine → Policy Evaluation
           → Context Optimizer → Context Strategy
           → Routing Engine → Route Decision
           → Execution Delegation → Gateway Call
           → Explainability → Explanation
           → Logger → Local Logs
```
