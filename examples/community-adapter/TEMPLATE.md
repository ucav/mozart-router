# Mozart Community Adapter Template

This directory is a template for creating community Mozart adapters.

## Quick start

1. Create a new npm package: `mkdir mozart-router-adapter-mygateway && cd mozart-router-adapter-mygateway`
2. Copy this template
3. Implement the `GatewayAdapter` interface
4. Export a `mozartPlugin` object
5. Publish to npm: `npm publish`

## Package structure

```
mozart-router-adapter-mygateway/
  package.json
  src/
    index.ts        # Main entry — MUST export mozartPlugin
    adapter.ts      # Your GatewayAdapter implementation
  README.md
```

## package.json

```json
{
  "name": "mozart-router-adapter-mygateway",
  "version": "1.0.0",
  "description": "Mozart adapter for MyGateway",
  "main": "src/index.js",
  "keywords": ["mozart", "adapter", "mygateway"],
  "peerDependencies": {
    "mozart-router": ">=0.1.0"
  }
}
```

## src/adapter.ts

```typescript
import {
  GatewayAdapter,
  DetectionResult,
  Provider,
  Model,
  ExecutionTarget,
  ExecutionRequest,
  ExecutionResult,
  RouteDecision,
} from 'mozart-router';

export class MyGatewayAdapter implements GatewayAdapter {
  id = 'mygateway';
  name = 'MyGateway';

  async detect(): Promise<DetectionResult> {
    // 1. Check if MyGateway is installed/configured
    // 2. NEVER read raw API keys
    // 3. Use apiKeyRef or apiKeyManagedBy for key tracking
    // 4. Return detailed detection info
    return {
      detected: true,
      gatewayId: this.id,
      gatewayName: this.name,
      status: 'active',
      providersCount: 1,
      modelsCount: 3,
      details: ['MyGateway detected at ...'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    return [
      {
        id: 'mygateway',
        name: 'MyGateway',
        source: 'detected',
        gateway: this.id,
        privacyLevel: 'cloud',
        status: 'available',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async listModels(): Promise<Model[]> {
    return [
      {
        id: 'my-model',
        providerId: 'mygateway',
        gatewayId: this.id,
        displayName: 'My Model',
        modality: ['text'],
        contextWindow: 8192,
        latencyClass: 'medium',
        qualityClass: 'medium',
        strengths: [],
        weaknesses: [],
        privacyLevel: 'cloud',
        availability: 'available',
        sourceConfidence: 'high',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async getExecutionTarget(decision: RouteDecision): Promise<ExecutionTarget> {
    return {
      adapter: this.id,
      provider: decision.selectedProvider,
      model: decision.selectedModel,
      method: 'gateway_call',
      apiKeyManagedBy: 'gateway',
    };
  }
}
```

## src/index.ts

```typescript
import { MozartPlugin } from 'mozart-router';
import { MyGatewayAdapter } from './adapter';

export const mozartPlugin: MozartPlugin = {
  name: 'mozart-router-adapter-mygateway',
  version: '1.0.0',
  adapters: [new MyGatewayAdapter()],
  async onRegister() {
    console.log('MyGateway adapter registered');
  },
};
```

## Rules for adapters

1. **Never store raw API keys.** Use `apiKeyRef` or `apiKeyManagedBy`.
2. **Never log secrets.** If you must reference keys, redact them.
3. **Detect don't configure.** Auto-detect the gateway, don't require manual setup.
4. **Delegate execution.** Let the gateway execute, Mozart decides.
5. **Graceful degradation.** If the gateway isn't available, return clean detection result.
6. **Test with mocks.** Provide at least unit tests with mocked gateway responses.

## Publishing

```bash
npm login
npm publish --access public
```

Once published, Mozart's plugin system auto-discovers your adapter when the user runs `mozart doctor`.

## Support

- GitHub: https://github.com/ucav/mozart-router
- Issues: https://github.com/ucav/mozart-router/issues
