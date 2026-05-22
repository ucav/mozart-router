# LiteLLM + Mozart

This directory contains an example LiteLLM configuration.

## Files

- `config.yaml` — Example LiteLLM config with Mozart integration notes

## Integration

Mozart detects LiteLLM automatically by scanning for `litellm_config.yaml` in common locations. When a config is found, Mozart reads the model entries and builds an inventory — **without accessing your raw API keys**.

1. Your existing `litellm_config.yaml` is all Mozart needs
2. Run `mozart doctor` to confirm detection
3. Mozart routes tasks to the best model in your LiteLLM config

## Status

LiteLLM integration is **real** — config detection, model extraction, and inventory building work. Execution is delegated to the LiteLLM proxy.

This integration is community-maintained. LiteLLM is its own project (https://github.com/BerriAI/litellm).
