import { describe, it, expect } from 'vitest';
import { OllamaAdapter } from '../src/adapters/ollama';

describe('OllamaAdapter', () => {
  const adapter = new OllamaAdapter();

  it('has correct id and name', () => {
    expect(adapter.id).toBe('ollama');
    expect(adapter.name).toBe('Ollama');
  });

  it('returns detection result', async () => {
    const detection = await adapter.detect();
    expect(detection).toBeDefined();
    expect(detection.gatewayId).toBe('ollama');
    expect(detection.gatewayName).toBe('Ollama');
    // When Ollama is not installed, should return not_found
    expect(['active', 'configured_only', 'not_found']).toContain(detection.status);
  });

  it('lists providers', async () => {
    const providers = await adapter.listProviders();
    expect(providers).toBeDefined();
    if (providers.length > 0) {
      expect(providers[0].privacyLevel).toBe('local');
    }
  });

  it('lists models', async () => {
    const models = await adapter.listModels();
    expect(models).toBeDefined();
    for (const model of models) {
      expect(model.providerId).toBe('ollama');
      expect(model.privacyLevel).toBe('local');
    }
  });

  it('provides execution target', async () => {
    const target = await adapter.getExecutionTarget({
      selectedProvider: 'ollama',
      selectedModel: 'llama3',
      score: 0.8,
      confidence: 0.9,
      contextStrategy: 'send_all',
      estimatedCost: 0,
      estimatedTokens: { input: 100, output: 30, total: 130 },
      fallbacks: [],
      explanation: [],
    });
    expect(target.adapter).toBe('ollama');
    expect(target.method).toBe('direct_http');
    expect(target.apiKeyManagedBy).toBe('none');
  });
});
