# OpenClaw + Mozart

This directory contains the Mozart skill manifest for OpenClaw.

## Files

- `mozart-skill.yaml` — Skill definitions for OpenClaw

## Integration

Mozart detects OpenClaw automatically by reading `~/.openclaw/openclaw.json`. All configured providers and models are imported into Mozart's inventory.

1. Install Mozart:
```bash
npm install mozart-router
```

2. The skill manifest can be added to your OpenClaw configuration

3. Mozart reads your existing providers/models without accessing your API keys

## Status

OpenClaw integration is **real**. Mozart reads the OpenClaw config file, extracts all providers and models, and routes tasks using your existing OpenClaw infrastructure. The adapter never reads or stores raw API keys.

This integration is community-maintained.
