import { describe, it, expect } from 'vitest';
import { OpenRouterAdapter } from '../src/adapters/openrouter';

describe('OpenRouterAdapter', () => {
  const adapter = new OpenRouterAdapter();

  it('has correct id and name', () => {
    expect(adapter.id).toBe('openrouter');
    expect(adapter.name).toBe('OpenRouter');
  });

  it('returns detection result based on env key', async () => {
    const result = await adapter.detect();
    expect(result.gatewayId).toBe('openrouter');
    expect(['active', 'not_found']).toContain(result.status);
    // Without a key, should not detect
    if (!process.env.OPENROUTER_API_KEY && !process.env.OR_API_KEY && !process.env.OPENROUTER_KEY) {
      expect(result.detected).toBe(false);
      expect(result.status).toBe('not_found');
    }
  });

  it('returns no models without an API key', async () => {
    if (!process.env.OPENROUTER_API_KEY && !process.env.OR_API_KEY && !process.env.OPENROUTER_KEY) {
      const models = await adapter.listModels();
      expect(models).toHaveLength(0);
    }
  });

  it('returns models (static or live) when API key is present', async () => {
    if (process.env.OPENROUTER_API_KEY || process.env.OR_API_KEY || process.env.OPENROUTER_KEY) {
      const models = await adapter.listModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0].gatewayId).toBe('openrouter');
      expect(models[0].privacyLevel).toBe('cloud');
    }
  });

  it('execute returns error without API key', async () => {
    if (!process.env.OPENROUTER_API_KEY && !process.env.OR_API_KEY && !process.env.OPENROUTER_KEY) {
      const result = await adapter.execute({
        input: 'test',
        model: 'deepseek/deepseek-chat',
        provider: 'openrouter',
        executionTarget: {
          adapter: 'openrouter',
          provider: 'openrouter',
          model: 'deepseek/deepseek-chat',
          apiKeyManagedBy: 'env',
          method: 'direct_http',
        },
      });
      expect(result.success).toBe(false);
      expect(result.delegated).toBe(false);
      expect(result.error).toMatch(/api key/i);
    }
  });

  it('provides correct execution target', async () => {
    const target = await adapter.getExecutionTarget({
      selectedProvider: 'openrouter',
      selectedModel: 'deepseek/deepseek-chat',
      score: 0.8,
      confidence: 0.9,
      contextStrategy: 'send_all',
      estimatedCost: 0.001,
      estimatedTokens: { input: 100, output: 50, total: 150 },
      fallbacks: [],
      explanation: [],
    });
    expect(target.adapter).toBe('openrouter');
    expect(target.apiKeyManagedBy).toBe('env');
    expect(target.method).toBe('direct_http');
    expect(target.baseUrl).toContain('openrouter.ai');
  });
});
