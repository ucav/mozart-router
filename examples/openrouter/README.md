# OpenRouter + Mozart

This directory contains an example OpenRouter configuration reference.

## Files

- `config.json` — Example OpenRouter config

## Integration

Mozart detects OpenRouter via the `OPENROUTER_API_KEY` environment variable. When configured, Mozart adds OpenRouter to its inventory and can route tasks to models available through OpenRouter.

1. Set your API key (already managed by your existing setup)
2. Mozart detects it and builds an inventory
3. Route tasks via Mozart's recommendation engine

## Status

OpenRouter integration is **real** — environment variable detection and curated model inventory work. Real-time model list from the API is not yet implemented to avoid unnecessary network calls.

This integration is community-maintained. OpenRouter is its own service (https://openrouter.ai).
