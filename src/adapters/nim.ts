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

export class NvidiaNimAdapter implements GatewayAdapter {
  id = 'nim';
  name = 'NVIDIA NIM';
  private baseUrl = 'http://localhost:8000';

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    const hasApiKey = !!process.env.NVIDIA_API_KEY;

    if (hasApiKey) {
      details.push('NVIDIA_API_KEY found in environment');
    }

    // Try local NIM endpoint
    let localDetected = false;
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        localDetected = true;
        details.push(`Local NIM endpoint detected at ${this.baseUrl}`);
      }
    } catch {
      // Local not available, check cloud
    }

    const active = localDetected || hasApiKey;
    const status: DetectionResult['status'] = active ? 'active' : 'not_found';

    if (!active) {
      details.push('No local NIM endpoint or NVIDIA_API_KEY found');
    }

    return {
      detected: active,
      gatewayId: this.id,
      gatewayName: this.name,
      status,
      providersCount: active ? 1 : 0,
      modelsCount: active ? 10 : 0,
      details,
    };
  }

  async listProviders(): Promise<Provider[]> {
    return [
      {
        id: 'nvidia-nim',
        name: 'NVIDIA NIM',
        source: 'detected',
        gateway: this.id,
        baseUrl: this.baseUrl,
        supportsModelsEndpoint: true,
        supportsStreaming: true,
        supportsTools: true,
        supportsJsonMode: true,
        supportsVision: 'unknown',
        privacyLevel: 'local',
        status: 'available',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async listModels(): Promise<Model[]> {
    // Try live local endpoint first (when NIM is deployed locally)
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json() as { data?: Array<{ id: string; owned_by?: string }> };
        const items = data.data ?? [];
        if (items.length > 0) {
          return items.map((m) => ({
            id: m.id,
            providerId: 'nvidia-nim',
            gatewayId: this.id,
            displayName: m.id,
            family: m.owned_by ?? m.id.split('/')[0],
            modality: ['text'] as Model['modality'],
            contextWindow: 131072,
            latencyClass: 'fast' as const,
            qualityClass: 'high' as const,
            strengths: ['local', 'fast', 'private'],
            weaknesses: [],
            supportsTools: true,
            supportsJsonMode: true,
            privacyLevel: 'local' as const,
            availability: 'available' as const,
            sourceConfidence: 'high' as const,
            lastCheckedAt: new Date().toISOString(),
          }));
        }
      }
    } catch { /* fall through to static catalog */ }

    // Static catalog fallback
    return [
      {
        id: 'meta/llama-3.1-8b-instruct',
        providerId: 'nvidia-nim',
        gatewayId: this.id,
        displayName: 'Llama 3.1 8B (NIM)',
        family: 'llama',
        modality: ['text'],
        contextWindow: 131072,
        latencyClass: 'fast',
        qualityClass: 'high',
        strengths: ['local', 'fast', 'coding', 'reasoning'],
        weaknesses: [],
        supportsTools: true,
        supportsJsonMode: true,
        privacyLevel: 'local',
        availability: 'available',
        sourceConfidence: 'high',
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'meta/llama-3.1-70b-instruct',
        providerId: 'nvidia-nim',
        gatewayId: this.id,
        displayName: 'Llama 3.1 70B (NIM)',
        family: 'llama',
        modality: ['text'],
        contextWindow: 131072,
        latencyClass: 'medium',
        qualityClass: 'premium',
        strengths: ['coding', 'reasoning', 'long_context'],
        weaknesses: ['needs_high_vram'],
        supportsTools: true,
        privacyLevel: 'local',
        availability: 'available',
        sourceConfidence: 'high',
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'mistralai/mixtral-8x7b-instruct',
        providerId: 'nvidia-nim',
        gatewayId: this.id,
        displayName: 'Mixtral 8x7B (NIM)',
        family: 'mixtral',
        modality: ['text'],
        contextWindow: 32768,
        latencyClass: 'medium',
        qualityClass: 'high',
        strengths: ['reasoning', 'general'],
        weaknesses: [],
        supportsTools: true,
        privacyLevel: 'local',
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
      baseUrl: this.baseUrl,
      apiKeyManagedBy: 'none',
      method: 'direct_http',
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      const apiKey = process.env.NVIDIA_API_KEY;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: request.model,
          messages: [{ role: 'user', content: request.input }],
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        return { success: false, error: `NIM error: ${response.status}` };
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      return {
        success: true,
        output: data.choices?.[0]?.message?.content ?? '',
        delegated: false,
      };
    } catch (err) {
      return { success: false, error: `NIM execution failed: ${err}` };
    }
  }
}
