import {
  GatewayAdapter,
  DetectionResult,
  GatewayConfigSummary,
  Provider,
  Model,
  ExecutionTarget,
  ExecutionRequest,
  ExecutionResult,
  RouteDecision,
} from '../types';

export class OpenRouterAdapter implements GatewayAdapter {
  id = 'openrouter';
  name = 'OpenRouter';

  private apiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY ?? process.env.OR_API_KEY ?? process.env.OPENROUTER_KEY;
  }

  private hasApiKey(): boolean {
    return !!this.apiKey();
  }

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    const key = this.apiKey();

    if (key) {
      const keyRef = process.env.OPENROUTER_API_KEY
        ? 'OPENROUTER_API_KEY'
        : process.env.OR_API_KEY
          ? 'OR_API_KEY'
          : 'OPENROUTER_KEY';
      details.push(`OpenRouter key detected: ${keyRef}`);
    } else {
      details.push('No OpenRouter API key found in environment');
    }

    return {
      detected: !!key,
      gatewayId: this.id,
      gatewayName: this.name,
      status: key ? 'active' : 'not_found',
      providersCount: key ? 1 : 0,
      modelsCount: key ? 200 : 0,
      details,
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    return {
      gatewayId: this.id,
      gatewayName: this.name,
      providers: ['openrouter'],
      models: [],
      capabilities: ['multi-provider', 'openai-compatible', 'streaming', 'tools'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    if (!this.hasApiKey()) return [];

    return [
      {
        id: 'openrouter',
        name: 'OpenRouter',
        source: 'detected',
        gateway: this.id,
        baseUrl: 'https://openrouter.ai/api/v1',
        supportsModelsEndpoint: true,
        supportsStreaming: true,
        supportsTools: true,
        supportsJsonMode: true,
        supportsVision: true,
        privacyLevel: 'cloud',
        status: 'available',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async listModels(): Promise<Model[]> {
    if (!this.hasApiKey()) return [];

    // Try live catalog first
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${this.apiKey()}` },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json() as {
          data?: Array<{
            id: string;
            name?: string;
            context_length?: number;
            pricing?: { prompt?: string; completion?: string };
            architecture?: { modality?: string };
          }>;
        };
        const items = data.data ?? [];
        if (items.length > 0) {
          return items.map((m) => {
            const inputPrice = m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1e6 : undefined;
            const outputPrice = m.pricing?.completion ? parseFloat(m.pricing.completion) * 1e6 : undefined;
            const modality = m.architecture?.modality?.includes('image') ? ['text', 'vision'] : ['text'];
            return {
              id: m.id,
              providerId: 'openrouter',
              gatewayId: this.id,
              displayName: m.name ?? m.id,
              family: m.id.split('/')[0],
              modality: modality as Model['modality'],
              contextWindow: m.context_length,
              inputPrice,
              outputPrice,
              latencyClass: 'medium' as const,
              qualityClass: inputPrice !== undefined && inputPrice > 2 ? 'premium' as const : 'high' as const,
              strengths: ['openrouter_managed'],
              weaknesses: [],
              supportsTools: 'unknown' as const,
              privacyLevel: 'cloud' as const,
              availability: 'available' as const,
              sourceConfidence: 'high' as const,
              lastCheckedAt: new Date().toISOString(),
            };
          });
        }
      }
    } catch { /* fall through to static catalog */ }

    // Static fallback catalog
    return [
      {
        id: 'deepseek/deepseek-chat',
        providerId: 'openrouter',
        gatewayId: this.id,
        displayName: 'DeepSeek V3',
        family: 'deepseek',
        modality: ['text'],
        contextWindow: 131072,
        inputPrice: 0.14,
        outputPrice: 0.28,
        latencyClass: 'medium',
        qualityClass: 'high',
        strengths: ['coding', 'reasoning', 'long_context'],
        weaknesses: [],
        supportsTools: true,
        privacyLevel: 'cloud',
        availability: 'available',
        sourceConfidence: 'high',
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'anthropic/claude-sonnet-4',
        providerId: 'openrouter',
        gatewayId: this.id,
        displayName: 'Claude Sonnet 4',
        family: 'claude',
        modality: ['text', 'vision'],
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        latencyClass: 'medium',
        qualityClass: 'premium',
        strengths: ['coding', 'reasoning', 'vision', 'tools', 'long_context'],
        weaknesses: ['expensive'],
        supportsTools: true,
        supportsJsonMode: true,
        privacyLevel: 'cloud',
        availability: 'available',
        sourceConfidence: 'high',
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'google/gemini-2.5-flash',
        providerId: 'openrouter',
        gatewayId: this.id,
        displayName: 'Gemini 2.5 Flash',
        family: 'gemini',
        modality: ['text', 'vision', 'multimodal'],
        contextWindow: 1048576,
        inputPrice: 0.15,
        outputPrice: 0.6,
        latencyClass: 'fast',
        qualityClass: 'high',
        strengths: ['long_context', 'fast', 'multimodal'],
        weaknesses: [],
        supportsTools: true,
        supportsJsonMode: true,
        privacyLevel: 'cloud',
        availability: 'available',
        sourceConfidence: 'high',
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        providerId: 'openrouter',
        gatewayId: this.id,
        displayName: 'Qwen 2.5 72B',
        family: 'qwen',
        modality: ['text'],
        contextWindow: 131072,
        inputPrice: 0.23,
        outputPrice: 0.4,
        latencyClass: 'medium',
        qualityClass: 'high',
        strengths: ['coding', 'reasoning', 'general'],
        weaknesses: [],
        supportsTools: true,
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
      provider: 'openrouter',
      model: decision.selectedModel,
      baseUrl: 'https://openrouter.ai/api/v1',
      requiresApiKey: true,
      apiKeyManagedBy: 'env',
      method: 'direct_http',
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const key = this.apiKey();
    if (!key) {
      return { success: false, error: 'No OpenRouter API key configured', delegated: false };
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://github.com/ucav/mozart-router',
          'X-Title': 'Mozart Router',
        },
        body: JSON.stringify({
          model: request.model,
          messages: [{ role: 'user', content: request.input }],
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return {
          success: false,
          error: `OpenRouter error ${response.status}: ${errText.slice(0, 200)}`,
          delegated: false,
        };
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      return {
        success: true,
        output: data.choices?.[0]?.message?.content ?? '',
        tokens: data.usage
          ? {
              input: data.usage.prompt_tokens ?? 0,
              output: data.usage.completion_tokens ?? 0,
              total: data.usage.total_tokens ?? 0,
            }
          : undefined,
        delegated: false,
      };
    } catch (err) {
      return {
        success: false,
        error: `OpenRouter execution failed: ${err}`,
        delegated: false,
      };
    }
  }
}
