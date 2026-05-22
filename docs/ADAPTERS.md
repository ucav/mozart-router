# Adapters

## Overview

Mozart adapters connect to existing gateways and tools. Each adapter implements the `GatewayAdapter` interface:

```typescript
interface GatewayAdapter {
  id: string;
  name: string;
  detect(): Promise<DetectionResult>;
  readConfig?(): Promise<GatewayConfigSummary>;
  listProviders(): Promise<Provider[]>;
  listModels(): Promise<Model[]>;
  listCapabilities?(): Promise<CapabilitySummary>;
  getExecutionTarget?(decision: RouteDecision): Promise<ExecutionTarget>;
  testConnection?(): Promise<ConnectionStatus>;
  execute?(request: ExecutionRequest): Promise<ExecutionResult>;
}
```

## Real adapters

### OllamaAdapter
- **ID:** `ollama`
- **Detection:** Checks for `ollama` in PATH, runs `ollama --version` and `ollama list`
- **Provider:** Local Ollama instance
- **Execution:** Direct HTTP to `http://localhost:11434`
- **Privacy:** Local-only, no API key needed

### LiteLLMAdapter
- **ID:** `litellm`
- **Detection:** Scans for `litellm_config.yaml` in common locations (cwd, ~/.litellm/)
- **Provider:** Parsed from config
- **Execution:** Delegates to LiteLLM proxy (does not execute directly)
- **Note:** Never reads or stores raw API keys from config

### OpenRouterAdapter
- **ID:** `openrouter`
- **Detection:** Checks for `OPENROUTER_API_KEY` in environment
- **Provider:** OpenRouter gateway
- **Execution:** Recommends models, delegates execution
- **Inventory:** Curated list of popular models with pricing

### OpenCodeAdapter
- **ID:** `opencode`
- **Status:** Real detection
- **Detection:** Checks for OpenCode installation via environment variables (OPENCODE_CLIENT, OPENCODE_SERVER_USERNAME) and data directory
- **Integration path:** `examples/opencode/mozart-skill.json`

### OpenClawAdapter
- **ID:** `openclaw`
- **Status:** Real detection — reads openclaw.json
- **Detection:** Parses `~/.openclaw/openclaw.json`, extracts all providers, models, gateway settings
- **Integration path:** `examples/openclaw/mozart-skill.yaml`

### LMStudioAdapter
- **ID:** `lmstudio`
- **Status:** Real — HTTP detection
- **Detection:** Queries `http://localhost:1234/v1/models`
- **Execution:** Direct HTTP to LM Studio's OpenAI-compatible endpoint

### VllmAdapter
- **ID:** `vllm`
- **Status:** Real — HTTP detection
- **Detection:** Queries `http://localhost:8000/v1/models`
- **Execution:** Direct HTTP to vLLM's OpenAI-compatible endpoint

### NvidiaNimAdapter
- **ID:** `nim`
- **Status:** Real — HTTP + env detection
- **Detection:** Queries local NIM endpoint + checks NVIDIA_API_KEY
- **Inventory:** Curated list of NIM-available models (Llama, Mixtral)

### GenericOpenAIAdapter
- **ID:** configurable
- **Status:** Universal plug-and-play
- **Detection:** Queries any OpenAI-compatible `/v1/models` endpoint
- **Auto-discovery:** Scans 11 common endpoints (Ollama, LM Studio, vLLM, LiteLLM, OpenRouter, OpenAI, Groq, Together, DeepSeek, Fireworks, Mistral)
- **Custom:** Accepts any base URL — no code changes needed for new gateways

## Stub adapters

These adapters have full typed interfaces ready but require the target environment for real detection:

### HermesAdapter
- **ID:** `hermes`
- **Status:** Stub with manifest
- **Integration path:** `examples/hermes/mozart-tool.json`
- **Next steps:** Connect to Hermes tool system

### CursorAdapter
- **ID:** `cursor`
- **Status:** Stub with documentation
- **Next steps:** Expose as local endpoint or use via SDK

## Creating a custom adapter

```typescript
import { GatewayAdapter, DetectionResult, Provider, Model } from 'mozart-router';

export class MyCustomAdapter implements GatewayAdapter {
  id = 'my-custom';
  name = 'My Custom Gateway';

  async detect(): Promise<DetectionResult> {
    // Check if your gateway is available
    return {
      detected: true,
      gatewayId: this.id,
      gatewayName: this.name,
      status: 'active',
      providersCount: 1,
      modelsCount: 3,
      details: ['Custom gateway detected'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    // Return your providers
    return [];
  }

  async listModels(): Promise<Model[]> {
    // Return your models
    return [];
  }
}
```
