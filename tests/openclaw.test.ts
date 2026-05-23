import { describe, it, expect } from 'vitest';
import { OpenClawAdapter } from '../src/adapters/openclaw';

describe('OpenClawAdapter', () => {
  const adapter = new OpenClawAdapter();

  it('has correct id and name', () => {
    expect(adapter.id).toBe('openclaw');
    expect(adapter.name).toBe('OpenClaw');
  });

  it('returns detection result', async () => {
    const result = await adapter.detect();
    expect(result.gatewayId).toBe('openclaw');
    expect(['active', 'not_found']).toContain(result.status);
  });

  it('provides execution target', async () => {
    const target = await adapter.getExecutionTarget({
      selectedProvider: 'openclaw-openai',
      selectedModel: 'gpt-4o',
      score: 0.8,
      confidence: 0.8,
      contextStrategy: 'send_all',
      estimatedCost: 0.01,
      estimatedTokens: { input: 100, output: 50, total: 150 },
      fallbacks: [],
      explanation: [],
    });
    expect(target.adapter).toBe('openclaw');
    expect(target.method).toBe('gateway_call');
    expect(target.apiKeyManagedBy).toBe('gateway');
    expect(target.baseUrl).toContain('localhost');
  });

  it('execute attempts HTTP and fails gracefully when gateway not running', async () => {
    const result = await adapter.execute({
      input: 'hello',
      model: 'gpt-4o',
      provider: 'openclaw-openai',
      executionTarget: {
        adapter: 'openclaw',
        provider: 'openclaw-openai',
        model: 'gpt-4o',
        baseUrl: 'http://localhost:14999', // port that should not be in use
        apiKeyManagedBy: 'gateway',
        method: 'gateway_call',
      },
    });
    expect(typeof result.success).toBe('boolean');
    // When gateway is not running, execution should fail gracefully
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.delegated).toBe(false);
    }
  });
});
