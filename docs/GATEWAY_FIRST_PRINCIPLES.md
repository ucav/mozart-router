# Gateway-First Principles

## Core rule

```
Do not rebuild what the gateway already does.
Detect it, understand it, orchestrate it.
```

## What gateways already do

Gateways like LiteLLM, OpenRouter, and agent tools like OpenCode already manage:

- API key storage and management
- Provider authentication
- Model inventory
- Low-level HTTP calls to LLM APIs
- Rate limiting and quota management
- Billing (in some cases)
- Fallback/retry (in some cases)

## What Mozart adds

Mozart adds intelligence on top of gateways without duplicating:

| Capability   | In Gateway | Mozart adds                       |
|-------------|-----------|----------------------------------|
| API keys    | Yes       | Reference management only         |
| Auth        | Yes       | Delegates to gateway              |
| Providers   | Yes       | Enriched inventory from all gateways |
| Models      | Yes       | Scored and ranked per task        |
| Execution   | Yes       | Routes to best gateway            |
| Routing     | Partial   | Full intelligent routing           |
| Privacy     | No        | Content scanning + policy         |
| Cost        | Basic     | Estimation + optimization         |
| Context     | No        | Token optimization + compression  |
| Explanation | No        | Full explainability               |
| Policy      | No        | Configurable policies             |
| Logging     | Partial   | Local logs with secret redaction   |

## Anti-patterns to avoid

### DON'T: Create a new proxy that replaces gateways
Mozart should delegate to existing gateways, not become a new proxy.

### DON'T: Ask users to copy all their API keys
If a gateway manages keys, Mozart only references that relationship.

### DON'T: Rebuild provider/model management
Mozart reads from gateways and enriches with intelligence.

### DON'T: Build a desktop application
Mozart is primarily an importable SDK and CLI tool.

### DON'T: Force cloud dependency
All core processing is local-first.

## Gateway introspection pattern

Every adapter follows this pattern:

1. **Detect** — Find configuration files, environment variables, or running services
2. **Read** — Parse existing config without duplicating it
3. **List** — Enumerate available providers and models
4. **Reference** — Store abstract references, never raw secrets
5. **Delegate** — Route execution back to the gateway
