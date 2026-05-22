import { describe, it, expect, vi } from 'vitest';
import { ResultCache } from '../src/core/cache';
import { RouteDecision } from '../src/types';

function makeRoute(): RouteDecision {
  return {
    selectedProvider: 'test', selectedModel: 'test-model', score: 0.8, confidence: 0.8,
    contextStrategy: 'send_all', estimatedCost: 0.01, estimatedTokens: { input: 100, output: 50, total: 150 },
    fallbacks: [], explanation: [],
  };
}

describe('ResultCache', () => {
  it('stores and retrieves entries', () => {
    const cache = new ResultCache();
    const route = makeRoute();
    cache.set('hello world', 'chat', route, { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' }, { input: 100, output: 50, total: 150 });
    expect(cache.size()).toBe(1);
    const entry = cache.get('hello world', 'chat');
    expect(entry).toBeDefined();
    expect(entry?.route.selectedModel).toBe('test-model');
  });

  it('returns undefined for cache miss', () => {
    const cache = new ResultCache();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('evicts when over max size', () => {
    const cache = new ResultCache({ maxSize: 3 });
    const route = makeRoute();
    const cost = { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' as const };
    const tokens = { input: 100, output: 50, total: 150 };
    cache.set('a', 'chat', route, cost, tokens);
    cache.set('b', 'chat', route, cost, tokens);
    cache.set('c', 'chat', route, cost, tokens);
    cache.set('d', 'chat', route, cost, tokens);
    expect(cache.size()).toBeLessThanOrEqual(3);
  });

  it('tracks hit count', () => {
    const cache = new ResultCache();
    const route = makeRoute();
    cache.set('test', 'chat', route, { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' }, { input: 100, output: 50, total: 150 });
    cache.get('test', 'chat');
    cache.get('test', 'chat');
    const entry = cache.get('test', 'chat');
    expect(entry?.hits).toBe(4);
  });

  it('prunes expired entries', async () => {
    const cache = new ResultCache({ defaultTtlMs: 10 });
    const route = makeRoute();
    cache.set('test', 'chat', route, { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' }, { input: 100, output: 50, total: 150 });
    expect(cache.size()).toBe(1);
    await new Promise((r) => setTimeout(r, 20));
    cache.prune();
    expect(cache.size()).toBe(0);
  });

  it('returns stats', () => {
    const cache = new ResultCache();
    const route = makeRoute();
    const cost = { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' as const };
    const tokens = { input: 100, output: 50, total: 150 };
    cache.set('a', 'chat', route, cost, tokens);
    cache.set('b', 'code_generation', route, cost, tokens);
    const stats = cache.stats();
    expect(stats.size).toBe(2);
  });

  it('clears all entries', () => {
    const cache = new ResultCache();
    cache.set('test', 'chat', makeRoute(), { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' }, { input: 100, output: 50, total: 150 });
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
