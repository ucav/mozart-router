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
import * as os from 'os';

export class OpenRouterAdapter implements GatewayAdapter {
  id = 'openrouter';
  name = 'OpenRouter';

  private hasApiKey(): boolean {
    return !!(
      process.env.OPENROUTER_API_KEY ||
      process.env.OR_API_KEY ||
      process.env.OPENROUTER_KEY
    );
  }

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    const hasKey = this.hasApiKey();

    if (hasKey) {
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
      detected: hasKey,
      gatewayId: this.id,
      gatewayName: this.name,
      status: hasKey ? 'active' : 'not_found',
      providersCount: hasKey ? 1 : 0,
      modelsCount: hasKey ? 200 : 0,
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
    if (!this.hasApiKey()) {
      return { success: false, error: 'No OpenRouter API key configured', delegated: true };
    }
    return { success: false, error: 'Execute via OpenRouter proxy or direct call', delegated: true };
  }
}
