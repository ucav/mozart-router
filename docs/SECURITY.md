# Security

## Design principles

1. **Local-first** — All core processing happens locally. No cloud dependency.
2. **No cloud by default for sensitive data** — Privacy Guard prevents secrets from reaching cloud models.
3. **Secrets never logged** — Redactor strips API keys, tokens, and credentials from logs.
4. **Policies explicit** — Users configure privacy and budget policies explicitly.
5. **No mandatory telemetry** — Mozart sends no data anywhere without explicit user action.
6. **User owns their keys** — Mozart never stores or manages API keys that gateways already manage.

## Privacy Guard

The Privacy Guard scans all content before routing to detect:

- API keys (sk-*, etc.)
- OAuth/access tokens
- GitHub tokens (ghp_*, gho_*, etc.)
- Private keys (RSA/EC/DSA/SSH)
- Credentials and secrets
- Environment variable files (.env-like patterns)

### Actions

| Action | Behavior |
|--------|----------|
| `allow` | Content is safe, can be sent anywhere |
| `redact` | Secrets are masked before sending |
| `block_cloud` | Content must not be sent to cloud models |
| `local_only` | Content must only be processed locally |
| `require_confirmation` | User must approve before sending |

### Privacy modes

| Mode | Description |
|------|-------------|
| `open` | Minimal restrictions |
| `balanced` | Standard protection (default) |
| `privacy_first` | Aggressive protection |
| `local_only` | All processing must be local |

## Log redaction

All logs pass through the `Redactor` before being written. It strips:

- API key patterns (sk-, AIza, etc.)
- GitHub tokens (ghp_, gho_, ghu_, ghs_)
- Slack tokens (xoxb-, xoxp-, etc.)
- HuggingFace tokens (hf_)
- Common secret environment variables (API_KEY, SECRET, TOKEN, etc.)

## Key management policy

Mozart follows a strict key management hierarchy:

1. **Gateway-managed keys** — Reference only (`managed_by_litellm`, `managed_by_opencode`)
2. **Environment variables** — Reference the variable name, never the value
3. **Manual keys** — Only for providers not covered by any gateway
4. **No raw key storage** — Keys are never written to disk by Mozart

## Budget protection

- Daily spending limits configurable via policy
- Warning threshold at configurable percentage
- Premium models only allowed for critical tasks (configurable)
- Cost estimation before execution

## Best practices

1. Always run `mozart doctor` to understand your detected stack
2. Set budget limits appropriate for your use case
3. Use `privacy_first` mode when handling customer data
4. Review `mozart why` explanations for routing decisions
5. Run `mozart simulate` before executing expensive tasks
