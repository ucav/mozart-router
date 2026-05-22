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

// Universal auto-discovery adapter for any OpenAI-compatible gateway.
// Simply point Mozart at a base URL and it will detect, inventory, and route.

export interface GenericAdapterConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv?: string;
  timeout?: number;
}

export class GenericOpenAIAdapter implements GatewayAdapter {
  id: string;
  name: string;
  private baseUrl: string;
  private apiKeyEnv?: string;
  private timeout: number;

  constructor(config: GenericAdapterConfig) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKeyEnv = config.apiKeyEnv;
    this.timeout = config.timeout ?? 5000;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKeyEnv && process.env[this.apiKeyEnv]) {
      h['Authorization'] = `Bearer ${process.env[this.apiKeyEnv]}`;
    }
    return h;
  }

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    let modelsCount = 0;
    let status: DetectionResult['status'] = 'not_found';

    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (response.ok) {
        const data = await response.json() as { data?: Array<{ id: string; owned_by?: string }> };
        const models = data.data ?? [];
        modelsCount = models.length;
        status = 'active';
        details.push(`OpenAI-compatible endpoint detected: ${this.baseUrl}`);
        details.push(`${modelsCount} models found`);
        for (const m of models.slice(0, 10)) {
          details.push(`  - ${m.id}`);
        }
        if (models.length > 10) {
          details.push(`  ... and ${models.length - 10} more`);
        }
      }
    } catch (err) {
      details.push(`No response from ${this.baseUrl}: ${String(err).slice(0, 80)}`);
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
    const hasKey = this.apiKeyEnv ? !!process.env[this.apiKeyEnv] : true;
    return [
      {
        id: this.id,
        name: this.name,
        source: 'detected',
        gateway: this.id,
        baseUrl: this.baseUrl,
        supportsModelsEndpoint: true,
        supportsStreaming: true,
        supportsTools: 'unknown',
        supportsJsonMode: 'unknown',
        privacyLevel: this.id.includes('local') || this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1') ? 'local' : 'cloud',
        status: hasKey ? 'available' : 'limited',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async listModels(): Promise<Model[]> {
    const models: Model[] = [];
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(this.timeout),
      });
      if (response.ok) {
        const data = await response.json() as { data?: Array<{ id: string; owned_by?: string }> };
        for (const entry of data.data ?? []) {
          const isLocal = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
          models.push({
            id: entry.id,
            providerId: this.id,
            gatewayId: this.id,
            displayName: entry.id,
            family: entry.owned_by,
            modality: ['text'],
            contextWindow: isLocal ? 8192 : 32768,
            latencyClass: isLocal ? 'fast' : 'medium',
            qualityClass: 'medium',
            strengths: isLocal ? ['local', 'private', 'free'] : ['openai_compatible'],
            weaknesses: ['capabilities_unknown'],
            privacyLevel: isLocal ? 'local' : 'cloud',
            availability: 'available',
            sourceConfidence: 'high',
            lastCheckedAt: new Date().toISOString(),
          });
        }
      }
    } catch { /* no models endpoint */ }
    return models;
  }

  async getExecutionTarget(decision: RouteDecision): Promise<ExecutionTarget> {
    return {
      adapter: this.id,
      provider: this.id,
      model: decision.selectedModel,
      baseUrl: this.baseUrl,
      requiresApiKey: !!this.apiKeyEnv,
      apiKeyManagedBy: this.apiKeyEnv ? 'env' : 'none',
      method: 'direct_http',
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          model: request.model,
          messages: [{ role: 'user', content: request.input }],
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return { success: false, error: `${this.name} error ${response.status}: ${errText.slice(0, 200)}`, delegated: false };
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
      return {
        success: true,
        output: data.choices?.[0]?.message?.content ?? '',
        tokens: data.usage ? { input: data.usage.prompt_tokens ?? 0, output: data.usage.completion_tokens ?? 0, total: data.usage.total_tokens ?? 0 } : undefined,
        delegated: false,
      };
    } catch (err) {
      return { success: false, error: `${this.name} execution failed: ${err}`, delegated: false };
    }
  }
}

// ── Auto-discovery utility ─────────────────────────────────

const COMMON_GATEWAY_URLS: Array<{ id: string; name: string; url: string; apiKeyEnv?: string }> = [
  { id: 'ollama-openai', name: 'Ollama (OpenAI endpoint)', url: 'http://localhost:11434/v1' },
  { id: 'lmstudio', name: 'LM Studio', url: 'http://localhost:1234/v1' },
  { id: 'vllm-local', name: 'vLLM (local)', url: 'http://localhost:8000/v1' },
  { id: 'litellm-local', name: 'LiteLLM (local)', url: 'http://localhost:4000/v1' },
  { id: 'openrouter-generic', name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', apiKeyEnv: 'OPENROUTER_API_KEY' },
  { id: 'openai-generic', name: 'OpenAI', url: 'https://api.openai.com/v1', apiKeyEnv: 'OPENAI_API_KEY' },
  { id: 'groq-generic', name: 'Groq', url: 'https://api.groq.com/openai/v1', apiKeyEnv: 'GROQ_API_KEY' },
  { id: 'together-generic', name: 'Together AI', url: 'https://api.together.xyz/v1', apiKeyEnv: 'TOGETHER_API_KEY' },
  { id: 'deepseek-generic', name: 'DeepSeek', url: 'https://api.deepseek.com/v1', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  { id: 'fireworks-generic', name: 'Fireworks', url: 'https://api.fireworks.ai/inference/v1', apiKeyEnv: 'FIREWORKS_API_KEY' },
  { id: 'mistral-generic', name: 'Mistral', url: 'https://api.mistral.ai/v1', apiKeyEnv: 'MISTRAL_API_KEY' },
];

export async function discoverAllGenericAdapters(): Promise<GenericOpenAIAdapter[]> {
  const discovered: GenericOpenAIAdapter[] = [];
  const results = await Promise.allSettled(
    COMMON_GATEWAY_URLS.map(async (entry) => {
      const adapter = new GenericOpenAIAdapter({
        id: entry.id,
        name: entry.name,
        baseUrl: entry.url,
        apiKeyEnv: entry.apiKeyEnv,
        timeout: 3000,
      });
      const detection = await adapter.detect();
      if (detection.detected) return adapter;
      return null;
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      discovered.push(result.value);
    }
  }

  return discovered;
}
