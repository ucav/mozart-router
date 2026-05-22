import {
  GatewayAdapter,
  DetectionResult,
  Provider,
  Model,
  ExecutionTarget,
  ExecutionRequest,
  ExecutionResult,
  RouteDecision,
} from '../types';

export class LMStudioAdapter implements GatewayAdapter {
  id = 'lmstudio';
  name = 'LM Studio';
  private baseUrl = 'http://localhost:1234';

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    let modelsCount = 0;
    let status: DetectionResult['status'] = 'not_found';

    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json() as { data?: Array<{ id: string }> };
        const models = data.data ?? [];
        modelsCount = models.length;
        status = 'active';
        details.push(`LM Studio server detected at ${this.baseUrl}`);
        details.push(`${modelsCount} models loaded`);
        for (const m of models) {
          details.push(`  - ${m.id}`);
        }
      }
    } catch {
      details.push(`No LM Studio server at ${this.baseUrl}`);
    }

    return {
      detected: status !== 'not_found',
      gatewayId: this.id,
      gatewayName: this.name,
      status,
      providersCount: status !== 'not_found' ? 1 : 0,
      modelsCount,
      details,
    };
  }

  async listProviders(): Promise<Provider[]> {
    return [
      {
        id: 'lmstudio',
        name: 'LM Studio Local',
        source: 'detected',
        gateway: this.id,
        baseUrl: this.baseUrl,
        supportsModelsEndpoint: true,
        supportsStreaming: true,
        supportsTools: 'unknown',
        supportsJsonMode: 'unknown',
        privacyLevel: 'local',
        status: 'available',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async listModels(): Promise<Model[]> {
    const models: Model[] = [];
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json() as { data?: Array<{ id: string }> };
        for (const entry of data.data ?? []) {
          models.push({
            id: entry.id,
            providerId: 'lmstudio',
            gatewayId: this.id,
            displayName: entry.id,
            modality: ['text'],
            contextWindow: 8192,
            latencyClass: 'medium',
            qualityClass: 'medium',
            strengths: ['local', 'free', 'private'],
            weaknesses: ['limited_context'],
            privacyLevel: 'local',
            availability: 'available',
            sourceConfidence: 'high',
            lastCheckedAt: new Date().toISOString(),
          });
        }
      }
    } catch { /* LM Studio not running */ }
    return models;
  }

  async getExecutionTarget(decision: RouteDecision): Promise<ExecutionTarget> {
    return {
      adapter: this.id,
      provider: decision.selectedProvider,
      model: decision.selectedModel,
      baseUrl: this.baseUrl,
      apiKeyManagedBy: 'none',
      method: 'direct_http',
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: [{ role: 'user', content: request.input }],
          stream: false,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        return { success: false, error: `LM Studio error: ${response.status}` };
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      return {
        success: true,
        output: data.choices?.[0]?.message?.content ?? '',
        delegated: false,
      };
    } catch (err) {
      return { success: false, error: `LM Studio execution failed: ${err}` };
    }
  }
}
