import { describe, it, expect } from 'vitest';
import { LiteLLMAdapter } from '../src/adapters/litellm';

describe('LiteLLMAdapter', () => {
  const adapter = new LiteLLMAdapter();

  it('has correct id and name', () => {
    expect(adapter.id).toBe('litellm');
    expect(adapter.name).toBe('LiteLLM');
  });

  it('returns detection result', async () => {
    const detection = await adapter.detect();
    expect(detection).toBeDefined();
    expect(detection.gatewayId).toBe('litellm');
    expect(['active', 'not_found']).toContain(detection.status);
  });

  it('reads config summary', async () => {
    const summary = await adapter.readConfig();
    expect(summary.gatewayId).toBe('litellm');
    expect(summary.gatewayName).toBe('LiteLLM');
    expect(summary.capabilities).toContain('multi-provider');
  });

  it('lists providers even without config', async () => {
    const providers = await adapter.listProviders();
    expect(providers).toBeDefined();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('lists models', async () => {
    const models = await adapter.listModels();
    expect(Array.isArray(models)).toBe(true);
  });

  it('does not execute directly', async () => {
    const result = await adapter.execute({
      input: 'test',
      model: 'gpt-4',
      provider: 'litellm',
      executionTarget: {
        adapter: 'litellm',
        provider: 'openai',
        model: 'gpt-4',
        apiKeyManagedBy: 'gateway',
        method: 'gateway_call',
      },
    });
    expect(result.success).toBe(false);
    expect(result.delegated).toBe(true);
  });
});
