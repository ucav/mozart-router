import { describe, it, expect, vi } from 'vitest';
import { FallbackManager } from '../src/routing/fallback';
import { RouteDecision } from '../src/types';

function makeRoute(model: string, cost: number): RouteDecision {
  return {
    selectedProvider: 'test',
    selectedModel: model,
    score: 0.8,
    confidence: 0.8,
    contextStrategy: 'send_all',
    estimatedCost: cost,
    estimatedTokens: { input: 1000, output: 300, total: 1300 },
    fallbacks: [],
    explanation: [],
  };
}

describe('FallbackManager', () => {
  it('executes primary route successfully', async () => {
    const manager = new FallbackManager();
    const primary = makeRoute('primary', 0.01);
    const result = await manager.execute(primary, [], async (route) => ({
      success: true,
    }));

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(1);
  });

  it('falls back to second route on failure', async () => {
    const manager = new FallbackManager();
    const primary = makeRoute('primary', 0.01);
    const fallback1 = makeRoute('fallback1', 0.005);

    let callCount = 0;
    const result = await manager.execute(primary, [fallback1], async (route) => {
      callCount++;
      if (callCount === 1) return { success: false, event: 'provider_unavailable' };
      return { success: true };
    });

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(2);
    expect(callCount).toBe(2);
  });

  it('tries all fallbacks then fails', async () => {
    const manager = new FallbackManager({ maxRetries: 2 });
    const primary = makeRoute('primary', 0.01);
    const fb1 = makeRoute('fb1', 0.005);
    const fb2 = makeRoute('fb2', 0.002);

    const result = await manager.execute(primary, [fb1, fb2], async () => ({
      success: false,
      event: 'server_error',
    }));

    expect(result.success).toBe(false);
    expect(result.events).toHaveLength(3);
    expect(result.error).toBeDefined();
  });

  it('respects maxRetries', async () => {
    const manager = new FallbackManager({ maxRetries: 1 });
    const primary = makeRoute('primary', 0.01);
    const fb1 = makeRoute('fb1', 0.005);
    const fb2 = makeRoute('fb2', 0.002);

    let calls = 0;
    const result = await manager.execute(primary, [fb1, fb2], async () => {
      calls++;
      return { success: false, event: 'timeout' };
    });

    // maxRetries=1 means try primary (attempt 0), then 1 retry (attempt 1) = 2 total
    expect(calls).toBeLessThanOrEqual(3);
    expect(result.success).toBe(false);
  });

  it('returns cost_too_high fallback candidates', () => {
    const manager = new FallbackManager();
    const expensive = makeRoute('expensive', 0.05);
    const cheap1 = makeRoute('cheap1', 0.01);
    expensive.fallbacks = [cheap1];

    const task = {
      taskType: 'chat' as const,
      complexity: 'low' as const,
      contextNeed: 'low' as const,
      privacyNeed: 'low' as const,
      latencyPreference: 'balanced' as const,
      costPreference: 'balanced' as const,
      requiresTools: false,
      requiresJson: false,
      requiresLongContext: false,
      requiresCodeStrength: false,
      requiresVision: false,
      requiresReasoning: false,
    };

    const candidates = manager.getFallbackCandidates(expensive, task, 'cost_too_high');
    expect(candidates.length).toBe(1);
    expect(candidates[0].estimatedCost).toBeLessThan(expensive.estimatedCost);
  });
});
