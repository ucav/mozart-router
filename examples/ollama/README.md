# Ollama + Mozart

This directory contains an example of using Mozart with Ollama for local model routing.

## Files

- `usage.ts` — Full example code

## Integration

Mozart detects Ollama automatically via the `ollama` CLI. All locally pulled models are added to Mozart's inventory.

1. Install Ollama: https://ollama.com
2. Pull models: `ollama pull llama3.2`, `ollama pull qwen2.5`
3. Mozart detects them automatically: `mozart doctor`
4. Tasks are routed to local models when appropriate (free, private)

## Example

```typescript
import { Mozart, OllamaAdapter } from 'mozart-router';

const mozart = new Mozart();
mozart.registry.registerAdapter(new OllamaAdapter());
await mozart.detectAll();

// Simple tasks → local model
const route = await mozart.recommend('hello');
console.log(route.selectedModel); // e.g. "llama3.2"
console.log(route.estimatedCost); // 0 (free)
```

## Status

Ollama integration is **real** — CLI detection, model listing, and direct HTTP execution all work.

This integration is community-maintained. Ollama is its own project (https://ollama.com).
