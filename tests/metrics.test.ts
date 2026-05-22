import { describe, it, expect } from 'vitest';
import { MetricsCollector } from '../src/core/metrics';

describe('MetricsCollector', () => {
  it('starts with zero values', () => {
    const collector = new MetricsCollector();
    const snapshot = collector.snapshot(0, 0);
    expect(snapshot.routes.total).toBe(0);
    expect(snapshot.costs.totalEstimated).toBe(0);
  });

  it('tracks routes', () => {
    const collector = new MetricsCollector();
    collector.recordRoute({
      selectedProvider: 'ollama', selectedModel: 'llama3', score: 0.8, confidence: 0.8,
      contextStrategy: 'send_all', estimatedCost: 0, estimatedTokens: { input: 100, output: 50, total: 150 },
      fallbacks: [], explanation: ['Task: code_generation (complexity: medium)'],
    });
    const snapshot = collector.snapshot(0, 0);
    expect(snapshot.routes.total).toBe(1);
    expect(snapshot.routes.byModel['llama3']).toBe(1);
  });

  it('exports prometheus format', () => {
    const collector = new MetricsCollector();
    collector.recordRoute({
      selectedProvider: 'ollama', selectedModel: 'llama3', score: 0.8, confidence: 0.8,
      contextStrategy: 'send_all', estimatedCost: 0, estimatedTokens: { input: 100, output: 50, total: 150 },
      fallbacks: [], explanation: ['Task: chat'],
    });
    collector.recordTokens({ input: 100, output: 50, total: 150 });
    const prom = collector.toPrometheus();
    expect(prom).toContain('mozart_routes_total 1');
    expect(prom).toContain('mozart_tokens_input_total');
  });

  it('tracks privacy blocks', () => {
    const collector = new MetricsCollector();
    collector.recordPrivacyCheck(true);
    collector.recordPrivacyCheck(false);
    collector.recordPrivacyCheck(true);
    const snapshot = collector.snapshot(0, 0);
    expect(snapshot.privacy.checks).toBe(3);
    expect(snapshot.privacy.blocks).toBe(2);
  });

  it('resets cleanly', () => {
    const collector = new MetricsCollector();
    collector.recordRoute({
      selectedProvider: 'test', selectedModel: 'test', score: 0.5, confidence: 0.5,
      contextStrategy: 'send_all', estimatedCost: 1, estimatedTokens: { input: 10, output: 5, total: 15 },
      fallbacks: [], explanation: ['Task: chat'],
    });
    collector.reset();
    expect(collector.snapshot(0, 0).routes.total).toBe(0);
  });
});
