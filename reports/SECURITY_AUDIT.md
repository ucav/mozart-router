# Security Audit — Mozart

**Date:** 2026-05-22  
**Repo:** https://github.com/ucav/mozart-router

---

## 1. Committed secrets check

| Pattern | Files scanned | Matches | Result |
|---------|-------------|---------|--------|
| API keys (sk-, AIza, etc.) | All src/ + tests/ | Test fixtures only | CLEAN |
| GitHub tokens (ghp_) | All files | Test fixtures only | CLEAN |
| Private keys (-----BEGIN) | All files | Regex patterns only | CLEAN |
| Environment variables (.env) | All files | Not present (.gitignore blocks) | CLEAN |
| Real credentials | All files | **0 found** | CLEAN |

All pattern matches are in:
- `src/privacy/guard.ts` — detection regex patterns
- `src/logs/redactor.ts` — redaction regex patterns
- `tests/privacy.test.ts` — fake test values (alphabetical sequences)
- `tests/redaction.test.ts` — fake test values

---

## 2. Example files check

| File | Contains real key? |
|------|-------------------|
| `examples/litellm/config.yaml` | No — uses `${VAR}` placeholders |
| `examples/openrouter/config.json` | No — uses `${OPENROUTER_API_KEY}` |
| `examples/ollama/usage.ts` | No — code-only example |
| All manifests | No — JSON/YAML schemas only |

---

## 3. CLI output check

CLI commands tested:
- `mozart doctor` — no secrets printed
- `mozart inventory` — no raw keys in JSON
- `mozart route` — no secrets in output
- `mozart simulate` — no secrets in output
- `mozart report` — no secrets in report

---

## 4. Log redaction check

The `Redactor` class covers:
- OpenAI keys (`sk-...`)
- Google API keys (`AIza...`)
- GitHub tokens (`ghp_`, `gho_`, `ghu_`, `ghs_`)
- Slack tokens (`xoxb-`, `xoxp-`, `xoxa-`, `xoxr-`, `xoxs-`)
- HuggingFace tokens (`hf_`)
- Environment variable secrets (`API_KEY=`, `SECRET=`, `TOKEN=`, `PASSWORD=`, etc.)

Tested in `tests/redaction.test.ts` (8 tests, all pass).

---

## 5. Privacy guard check

The `PrivacyGuard` detects:
- API keys
- Tokens
- Private keys (RSA, EC, DSA, SSH, PGP)
- Credentials
- .env-like patterns

Actions enforced:
- `allow` — safe content
- `redact` — mask secrets
- `block_cloud` — prevent cloud routing
- `local_only` — only local models
- `require_confirmation` — user must approve

Tested in `tests/privacy.test.ts` (8 tests, all pass).

---

## 6. Git configuration

| Check | Status |
|-------|--------|
| `.gitignore` present | Yes |
| `.env` ignored | Yes |
| `node_modules/` ignored | Yes |
| `dist/` ignored | Yes |
| `*.log` ignored | Yes |

---

## 7. Key management policy

Mozart **never**:
- Reads raw API keys from gateway configs
- Stores API keys on disk
- Logs API keys (redactor strips them)
- Prints API keys in CLI output
- Sends API keys to any model

Mozart **only**:
- References the existence of keys (`apiKeyManagedBy: 'gateway'`)
- Detects environment variable names (not values)
- Uses adapter-level execution when the gateway is the one that holds the key

---

## 8. Conclusion

**Mozart v0.1.0 is clean.** No secrets are committed, leaked, or exposed in any output. The privacy guard, redactor, and key management policy provide defense in depth.
