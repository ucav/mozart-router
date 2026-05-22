import { describe, it, expect } from 'vitest';
import { LMStudioAdapter } from '../src/adapters/lmstudio';
import { VllmAdapter } from '../src/adapters/vllm';
import { NvidiaNimAdapter } from '../src/adapters/nim';

describe('LMStudioAdapter', () => {
  const adapter = new LMStudioAdapter();
  it('has correct id and name', () => {
    expect(adapter.id).toBe('lmstudio');
    expect(adapter.name).toBe('LM Studio');
  });
  it('detects or reports not found', async () => {
    const result = await adapter.detect();
    expect(['active', 'not_found']).toContain(result.status);
  });
  it('lists providers', async () => {
    const providers = await adapter.listProviders();
    expect(providers.length).toBeGreaterThanOrEqual(0);
  });
  it('lists models', async () => {
    const models = await adapter.listModels();
    expect(Array.isArray(models)).toBe(true);
  });
});

describe('VllmAdapter', () => {
  const adapter = new VllmAdapter();
  it('has correct id and name', () => {
    expect(adapter.id).toBe('vllm');
    expect(adapter.name).toBe('vLLM');
  });
  it('detects or reports not found', async () => {
    const result = await adapter.detect();
    expect(['active', 'not_found']).toContain(result.status);
  });
  it('provides execution target', async () => {
    const target = await adapter.getExecutionTarget({
      selectedProvider: 'vllm', selectedModel: 'test', score: 0.8, confidence: 0.8,
      contextStrategy: 'send_all', estimatedCost: 0, estimatedTokens: { input: 100, output: 50, total: 150 },
      fallbacks: [], explanation: [],
    });
    expect(target.apiKeyManagedBy).toBe('none');
    expect(target.method).toBe('direct_http');
  });
});

describe('NvidiaNimAdapter', () => {
  const adapter = new NvidiaNimAdapter();
  it('has correct id and name', () => {
    expect(adapter.id).toBe('nim');
    expect(adapter.name).toBe('NVIDIA NIM');
  });
  it('detects or reports not found', async () => {
    const result = await adapter.detect();
    expect(['active', 'not_found']).toContain(result.status);
  });
  it('lists models from catalog', async () => {
    const models = await adapter.listModels();
    expect(Array.isArray(models)).toBe(true);
    if (models.length > 0) {
      expect(models[0].providerId).toBe('nvidia-nim');
      expect(models[0].privacyLevel).toBe('local');
    }
  });
});
