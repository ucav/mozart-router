# Recommend-Only Mode — Mozart

Mozart's default mode is **recommend-only** — it decides, it does not execute.

## Principle

```
Gateways execute. Mozart decides.
```

Mozart's purpose is to provide intelligent routing decisions. The actual execution is delegated to the gateway that the user already has configured. Mozart does not need to execute directly to be useful.

## How it works

When you call:

```typescript
const route = await mozart.recommend('debug the authentication error');
```

Mozart:
1. Classifies the task (type, complexity, context needs)
2. Scans for sensitive data (privacy guard)
3. Evaluates policies (budget, routing rules)
4. Scores all available models across 7 dimensions
5. Returns a `RouteDecision` with:
   - Selected gateway, provider, model
   - Confidence score
   - Estimated cost and tokens
   - Full explanation
   - Fallback chain

**No execution happens.** Your existing gateway handles the actual API call.

## Why recommend-only?

1. **No key duplication.** Your gateways (LiteLLM, OpenRouter, Ollama) already manage API keys. Mozart doesn't need them.
2. **No new proxy.** Mozart adds intelligence without adding infrastructure.
3. **Universal compatibility.** Even agents that can't route through Mozart can still use its recommendations.
4. **Safe by default.** Until you explicitly configure execution, Mozart is read-only advisory.

## Enabling execution

If you want Mozart to execute:

```typescript
const response = await mozart.process({
  input: 'write a function',
  executionMode: 'execute', // or 'delegate'
});
```

Mozart will then attempt to execute via the selected gateway adapter. If the adapter doesn't support execution, it falls back to recommend-only.

## CLI

All CLI commands are recommend-only by default:

```bash
npm run mozart -- simulate "debug my build"  # Simulates, doesn't execute
npm run mozart -- route "write tests"          # Routes, doesn't execute
```

## API

The HTTP API also defaults to recommend-only:

```json
POST /v1/route
{
  "task": "refactor auth module",
  "execution_mode": "recommend"
}
```

## Design intent

Recommend-only mode is not a limitation — it's the core design decision that makes Mozart:
- Lightweight (no provider logic)
- Secure (no key management)
- Compatible (works with any gateway)
- Honest (never claims it executes when it recommends)
