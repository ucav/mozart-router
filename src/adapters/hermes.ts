import {
  GatewayAdapter,
  DetectionResult,
  GatewayConfigSummary,
  Provider,
  Model,
} from '../types';

export class HermesAdapter implements GatewayAdapter {
  id = 'hermes';
  name = 'Hermes Agent';

  async detect(): Promise<DetectionResult> {
    return {
      detected: false,
      gatewayId: this.id,
      gatewayName: this.name,
      status: 'not_found',
      providersCount: 0,
      modelsCount: 0,
      details: [
        'Hermes adapter is a stub — real integration requires Hermes Agent environment.',
        'Install Mozart as tool via manifest: examples/hermes/mozart-tool.json',
        'Mozart can then serve as provider decision layer for Hermes workflows.',
      ],
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    return {
      gatewayId: this.id,
      gatewayName: this.name,
      providers: [],
      models: [],
      capabilities: ['agent', 'tools', 'workflows', 'agentic'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    return [];
  }

  async listModels(): Promise<Model[]> {
    return [];
  }
}
