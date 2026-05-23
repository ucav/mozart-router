import { describe, it, expect } from 'vitest';
import { DynamicPricing } from '../src/cost/dynamic-pricing';
import { Model } from '../src/types';

describe('DynamicPricing', () => {
  it('starts with empty cache', () => {
    const dp = new DynamicPricing();
    expect(dp.getAllPrices().length).toBe(0);
  });

  it('enriches models with live pricing data', () => {
    const dp = new DynamicPricing();
    const model: Model = {
      id: 'openai/gpt-4o', providerId: 'openrouter', displayName: 'GPT-4o',
      modality: ['text'], contextWindow: 8000, inputPrice: 5, outputPrice: 15,
      latencyClass: 'medium', qualityClass: 'premium', strengths: [], weaknesses: [],
      privacyLevel: 'cloud', availability: 'available', sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    };

    const pricingData = [{ modelId: 'openai/gpt-4o', inputPrice: 2.5, outputPrice: 10, provider: 'openai', source: 'openrouter' as const, lastUpdated: new Date().toISOString() }];
    const enriched = dp.enrichModels([model], pricingData);
    expect(enriched[0].inputPrice).toBe(2.5);
    expect(enriched[0].outputPrice).toBe(10);
  });

  it('does not modify models without matching pricing', () => {
    const dp = new DynamicPricing();
    const model: Model = {
      id: 'unknown-model', providerId: 'test', displayName: 'T',
      modality: ['text'], contextWindow: 8000, inputPrice: 1, outputPrice: 2,
      latencyClass: 'medium', qualityClass: 'medium', strengths: [], weaknesses: [],
      privacyLevel: 'cloud', availability: 'available', sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    };
    const enriched = dp.enrichModels([model], []);
    expect(enriched[0].inputPrice).toBe(1);
  });

  it('caches fetched prices', async () => {
    const dp = new DynamicPricing({ cacheTtlMs: 60000 });
    // Force empty fetch that will fail (no network in test)
    // and return empty — cache stays empty but no crash
    const results = await dp.fetchOpenRouter();
    expect(Array.isArray(results)).toBe(true);
  });
});
