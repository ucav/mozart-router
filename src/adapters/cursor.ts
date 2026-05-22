import {
  GatewayAdapter,
  DetectionResult,
  GatewayConfigSummary,
  Provider,
  Model,
} from '../types';

export class CursorAdapter implements GatewayAdapter {
  id = 'cursor';
  name = 'Cursor';

  async detect(): Promise<DetectionResult> {
    return {
      detected: false,
      gatewayId: this.id,
      gatewayName: this.name,
      status: 'not_found',
      providersCount: 0,
      modelsCount: 0,
      details: [
        'Cursor adapter is a stub — direct integration depends on Cursor extension API.',
        'Mozart can be exposed as local endpoint for Cursor to consume.',
        'Alternatively, use Mozart as advisory layer via CLI or SDK.',
      ],
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    return {
      gatewayId: this.id,
      gatewayName: this.name,
      providers: [],
      models: [],
      capabilities: ['ide', 'coding', 'agent', 'editing'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    return [];
  }

  async listModels(): Promise<Model[]> {
    return [];
  }
}
