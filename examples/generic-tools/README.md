# Generic Tools — Mozart

This directory contains a generic tool collection manifest for Mozart.

## Files

- `mozart-tools.json` — All 7 Mozart skills as generic tool definitions

## Usage

Use this manifest to integrate Mozart as a tool collection in any agent framework that supports JSON tool definitions:

```json
{
  "tools": ["path/to/examples/generic-tools/mozart-tools.json"]
}
```

The manifest is framework-agnostic and follows the standard tool definition format used by most AI agent frameworks.

## SKills included

1. `mozart.route_model` — Choose best model/provider for a task
2. `mozart.explain_route` — Explain routing decisions
3. `mozart.estimate_cost` — Estimate cost before execution
4. `mozart.compress_context` — Optimize context for tokens
5. `mozart.privacy_check` — Scan for secrets before sending
6. `mozart.fallback_plan` — Generate fallback execution plans
7. `mozart.inventory` — List detected gateways, providers, models
