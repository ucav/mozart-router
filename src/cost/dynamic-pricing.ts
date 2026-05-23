import { Model } from '../types';

// Dynamic pricing intelligence — fetches live model pricing from public APIs.
// Currently supports OpenRouter's free model list endpoint (no API key needed).

export interface LivePricingResult {
  modelId: string;
  inputPrice?: number;
  outputPrice?: number;
  contextWindow?: number;
  provider: string;
  source: 'openrouter' | 'manual';
  lastUpdated: string;
}

export class DynamicPricing {
  private cache: Map<string, LivePricingResult> = new Map();
  private lastFetch = 0;
  private cacheTtlMs: number;

  constructor(options?: { cacheTtlMs?: number }) {
    this.cacheTtlMs = options?.cacheTtlMs ?? 3600000; // 1 hour
  }

  async fetchOpenRouter(): Promise<LivePricingResult[]> {
    if (Date.now() - this.lastFetch < this.cacheTtlMs && this.cache.size > 0) {
      return Array.from(this.cache.values());
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return [];

      const data = await response.json() as {
        data?: Array<{
          id: string;
          name?: string;
          context_length?: number;
          pricing?: { prompt?: string; completion?: string };
        }>;
      };

      const results: LivePricingResult[] = [];
      for (const model of data.data ?? []) {
        const inputPrice = model.pricing?.prompt ? parseFloat(model.pricing.prompt) * 1000 : undefined; // per 1K tokens
        const outputPrice = model.pricing?.completion ? parseFloat(model.pricing.completion) * 1000 : undefined;

        const result: LivePricingResult = {
          modelId: model.id,
          inputPrice,
          outputPrice,
          contextWindow: model.context_length,
          provider: model.id.split('/')[0] ?? 'unknown',
          source: 'openrouter',
          lastUpdated: new Date().toISOString(),
        };

        this.cache.set(model.id, result);
        results.push(result);
      }

      this.lastFetch = Date.now();
      return results;
    } catch {
      return Array.from(this.cache.values());
    }
  }

  enrichModels(models: Model[], pricingData: LivePricingResult[]): Model[] {
    const pricingMap = new Map(pricingData.map((p) => [p.modelId, p]));

    return models.map((model) => {
      const livePrice = pricingMap.get(model.id);
      if (!livePrice) return model;

      return {
        ...model,
        inputPrice: livePrice.inputPrice ?? model.inputPrice,
        outputPrice: livePrice.outputPrice ?? model.outputPrice,
        contextWindow: livePrice.contextWindow ?? model.contextWindow,
      };
    });
  }

  getPrice(modelId: string): LivePricingResult | undefined {
    return this.cache.get(modelId);
  }

  getAllPrices(): LivePricingResult[] {
    return Array.from(this.cache.values());
  }

  clearCache(): void {
    this.cache.clear();
    this.lastFetch = 0;
  }
}
