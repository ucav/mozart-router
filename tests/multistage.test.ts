import { describe, it, expect } from 'vitest';
import { MultiStageRouter } from '../src/routing/multistage';
import { InventoryRegistry } from '../src/core/inventory';
import { PolicyEngine } from '../src/policy/engine';
import { TaskClassifier } from '../src/routing/classifier';
import { RoutingEngine } from '../src/routing/router';
import { CostEstimator } from '../src/cost/estimator';
import { ContextOptimizer } from '../src/context/optimizer';
import { PrivacyGuard } from '../src/privacy/guard';

function makeMultiStageRouter(): MultiStageRouter {
  const registry = new InventoryRegistry();
  registry.addProvider({ id: 'test', name: 'Test', source: 'manual', privacyLevel: 'cloud', status: 'available', lastCheckedAt: new Date().toISOString() });
  registry.addModel({
    id: 'test-model', providerId: 'test', displayName: 'Test Model', modality: ['text'], contextWindow: 128000, inputPrice: 1, outputPrice: 2,
    latencyClass: 'medium', qualityClass: 'high', strengths: ['coding', 'reasoning'], weaknesses: [], supportsTools: true,
    privacyLevel: 'cloud', availability: 'available', sourceConfidence: 'high', lastCheckedAt: new Date().toISOString(),
  });
  const policy = new PolicyEngine();
  const classifier = new TaskClassifier();
  const cost = new CostEstimator();
  const ctx = new ContextOptimizer();
  const privacy = new PrivacyGuard();
  const router = new RoutingEngine(registry, policy, cost);
  return new MultiStageRouter(registry, policy, classifier, router, cost, ctx, privacy);
}

describe('MultiStageRouter', () => {
  it('defines single stage for simple tasks', () => {
    const msr = makeMultiStageRouter();
    const stages = msr.defineStages('hello');
    expect(stages.length).toBe(1);
    expect(stages[0].name).toBe('generate');
  });

  it('defines 3 stages for code generation', () => {
    const msr = makeMultiStageRouter();
    const stages = msr.defineStages('implement a user authentication module');
    expect(stages.length).toBe(3);
    expect(stages.map((s) => s.name)).toEqual(['analyze', 'generate', 'review']);
  });

  it('defines 4 stages for debugging', () => {
    const msr = makeMultiStageRouter();
    const stages = msr.defineStages('debug the login error');
    expect(stages.length).toBe(4);
    expect(stages.map((s) => s.name)).toEqual(['classify', 'analyze', 'fix', 'verify']);
  });

  it('defines 3 stages for security audit', () => {
    const msr = makeMultiStageRouter();
    const stages = msr.defineStages('security audit of payment module');
    expect(stages.length).toBe(3);
    expect(stages.map((s) => s.name)).toEqual(['scan', 'analyze', 'recommend']);
  });

  it('executes multi-stage pipeline', async () => {
    const msr = makeMultiStageRouter();
    let callCount = 0;
    const result = await msr.execute('write a sort function', async (step, route) => {
      callCount++;
      return {
        output: `Stage ${step.name} done`,
        cost: { inputCost: 0.001, outputCost: 0.002, totalCost: 0.003, currency: 'USD' },
        tokens: { input: 50, output: 30, total: 80 },
      };
    });
    expect(result.success).toBe(true);
    expect(result.steps.length).toBe(3);
    expect(callCount).toBe(3);
    expect(result.totalTokens.input).toBe(150);
  });
});
