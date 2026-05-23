---
name: mozart-router
description: Route AI tasks to the best available model based on cost, context, latency, privacy and reliability. Gateways execute — Mozart decides.
license: MIT
compatibility: opencode
metadata:
  audience: ai-builders
  category: orchestration
---

# Mozart Router — OpenCode Skill

## What I do
- Detect your configured AI providers and models
- Classify each task and select the optimal model/provider
- Estimate cost and tokens before execution
- Scan for secrets and block cloud leaks
- Explain every routing decision
- Fall back gracefully when providers fail

## When to use me
Use this skill when the agent needs to:
- Choose between multiple available models
- Estimate the cost of an LLM call before making it
- Check if context contains secrets before sending to a cloud model
- Optimize context to reduce token usage
- Get a fallback plan in case a model fails

## How to use
Call the Mozart MCP server or SDK:

```typescript
import { Mozart } from 'mozart-router';
const mozart = new Mozart();
await mozart.detectAll();
const route = await mozart.recommend('your task here');
```

## Integration modes
- **MCP Server**: `npx mozart-router mcp`
- **CLI**: `npx mozart-router doctor`
- **SDK**: `import { Mozart } from 'mozart-router'`
- **HTTP API**: `npx mozart-router start --port=4444`

Gateways execute. Mozart decides.
Do not rebuild what the gateway already does.
Detect it, understand it, orchestrate it.
