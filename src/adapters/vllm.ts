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

export class VllmAdapter implements GatewayAdapter {
  id = 'vllm';
  name = 'vLLM';
  private baseUrl = 'http://localhost:8000';

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
        details.push(`vLLM server detected at ${this.baseUrl}`);
        details.push(`${modelsCount} models served`);
        for (const m of models) {
          details.push(`  - ${m.id}`);
        }
      }
    } catch {
      details.push(`No vLLM server at ${this.baseUrl}`);
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
        id: 'vllm',
        name: 'vLLM Server',
        source: 'detected',
        gateway: this.id,
        baseUrl: this.baseUrl,
        supportsModelsEndpoint: true,
        supportsStreaming: true,
        supportsTools: 'unknown',
        supportsJsonMode: true,
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
            providerId: 'vllm',
            gatewayId: this.id,
            displayName: entry.id,
            modality: ['text'],
            contextWindow: 32768,
            latencyClass: 'fast',
            qualityClass: 'high',
            strengths: ['local', 'fast', 'private', 'openai_compatible'],
            weaknesses: ['requires_gpu'],
            supportsJsonMode: true,
            privacyLevel: 'local',
            availability: 'available',
            sourceConfidence: 'high',
            lastCheckedAt: new Date().toISOString(),
          });
        }
      }
    } catch { /* vLLM not running */ }
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
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        return { success: false, error: `vLLM error: ${response.status}` };
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      return {
        success: true,
        output: data.choices?.[0]?.message?.content ?? '',
        delegated: false,
      };
    } catch (err) {
      return { success: false, error: `vLLM execution failed: ${err}` };
    }
  }
}
