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

## Stub adapters

These adapters are structured and ready for integration but require the actual environment:

### OpenCodeAdapter
- **ID:** `opencode`
- **Status:** Stub with manifest
- **Integration path:** `examples/opencode/mozart-skill.json`
- **Next steps:** Read OpenCode config file, detect configured providers

### OpenClawAdapter
- **ID:** `openclaw`
- **Status:** Stub with manifest
- **Integration path:** `examples/openclaw/mozart-skill.yaml`
- **Next steps:** Connect to OpenClaw skill system

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
