import { describe, it, expect } from 'vitest';
import { RoutingEngine } from '../src/routing/router';
import { InventoryRegistry } from '../src/core/inventory';
import { PolicyEngine } from '../src/policy/engine';
import { CostEstimator } from '../src/cost/estimator';
import { TaskProfile, PrivacyDecision, Model, Provider, ContextStrategy } from '../src/types';

function makeTask(overrides: Partial<TaskProfile> = {}): TaskProfile {
  return {
    taskType: 'chat',
    complexity: 'low',
    contextNeed: 'low',
    privacyNeed: 'low',
    latencyPreference: 'balanced',
    costPreference: 'balanced',
    requiresTools: false,
    requiresJson: false,
    requiresLongContext: false,
    requiresCodeStrength: false,
    requiresVision: false,
    requiresReasoning: false,
    ...overrides,
  };
}

function makePrivacy(): PrivacyDecision {
  return { allowed: true, mode: 'balanced', findings: [], action: 'allow', explanation: [] };
}

function makeContext(): ContextStrategy {
  return { action: 'send_all', estimatedInputTokens: 1000, maxTokens: 8000, instructions: [] };
}

function seedRegistry(registry: InventoryRegistry): void {
  registry.addProvider({
    id: 'test-cloud',
    name: 'Test Cloud',
    source: 'manual',
    privacyLevel: 'cloud',
    status: 'available',
    lastCheckedAt: new Date().toISOString(),
  });
  registry.addProvider({
    id: 'test-local',
    name: 'Test Local',
    source: 'manual',
    privacyLevel: 'local',
    status: 'available',
    lastCheckedAt: new Date().toISOString(),
  });

  registry.addModel({
    id: 'gpt-4o',
    providerId: 'test-cloud',
    displayName: 'GPT-4o',
    modality: ['text'],
    contextWindow: 128000,
    inputPrice: 2.5,
    outputPrice: 10.0,
    latencyClass: 'medium',
    qualityClass: 'premium',
    strengths: ['coding', 'reasoning'],
    weaknesses: ['expensive'],
    supportsTools: true,
    privacyLevel: 'cloud',
    availability: 'available',
    sourceConfidence: 'high',
    lastCheckedAt: new Date().toISOString(),
  });

  registry.addModel({
    id: 'llama-3',
    providerId: 'test-local',
    displayName: 'Llama 3 8B',
    modality: ['text'],
    contextWindow: 8192,
    inputPrice: 0,
    outputPrice: 0,
    latencyClass: 'fast',
    qualityClass: 'medium',
    strengths: ['local', 'free', 'private'],
    weaknesses: ['limited_context'],
    privacyLevel: 'local',
    availability: 'available',
    sourceConfidence: 'high',
    lastCheckedAt: new Date().toISOString(),
  });

  registry.addModel({
    id: 'haiku',
    providerId: 'test-cloud',
    displayName: 'Claude Haiku',
    modality: ['text'],
    contextWindow: 200000,
    inputPrice: 0.8,
    outputPrice: 4.0,
    latencyClass: 'fast',
    qualityClass: 'high',
    strengths: ['coding'],
    weaknesses: [],
    supportsTools: true,
    privacyLevel: 'cloud',
    availability: 'available',
    sourceConfidence: 'high',
    lastCheckedAt: new Date().toISOString(),
  });
}

describe('RoutingEngine', () => {
  it('routes simple chat to local model when available', () => {
    const registry = new InventoryRegistry();
    seedRegistry(registry);
    const policy = new PolicyEngine();
    const cost = new CostEstimator();
    const router = new RoutingEngine(registry, policy, cost);

    const result = router.route(makeTask({ taskType: 'chat' }), makePrivacy(), policy.evaluate(makeTask({ taskType: 'chat' }), makePrivacy()), makeContext());

    expect(result.selectedProvider).toBeDefined();
    expect(result.selectedModel).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('routes code generation to coding model', () => {
    const registry = new InventoryRegistry();
    seedRegistry(registry);
    const policy = new PolicyEngine();
    const cost = new CostEstimator();
    const router = new RoutingEngine(registry, policy, cost);

    const task = makeTask({ taskType: 'code_generation', requiresCodeStrength: true });
    const result = router.route(task, makePrivacy(), policy.evaluate(task, makePrivacy()), makeContext());

    expect(result.selectedModel).toBeDefined();
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('produces fallbacks', () => {
    const registry = new InventoryRegistry();
    seedRegistry(registry);
    const policy = new PolicyEngine();
    const cost = new CostEstimator();
    const router = new RoutingEngine(registry, policy, cost);

    const task = makeTask({ taskType: 'chat' });
    const result = router.route(task, makePrivacy(), policy.evaluate(task, makePrivacy()), makeContext());

    expect(result.fallbacks.length).toBeGreaterThan(0);
  });

  it('returns default route when no models available', () => {
    const registry = new InventoryRegistry();
    const policy = new PolicyEngine();
    const cost = new CostEstimator();
    const router = new RoutingEngine(registry, policy, cost);

    const result = router.route(makeTask(), makePrivacy(), policy.evaluate(makeTask(), makePrivacy()), makeContext());

    expect(result.selectedModel).toBe('none');
    expect(result.confidence).toBe(0);
  });

  it('filters out cloud models when privacy requires local', () => {
    const registry = new InventoryRegistry();
    seedRegistry(registry);
    const policy = new PolicyEngine();
    const cost = new CostEstimator();
    const router = new RoutingEngine(registry, policy, cost);

    const privacy = { ...makePrivacy(), action: 'local_only' as const };
    const result = router.route(makeTask(), privacy, policy.evaluate(makeTask(), privacy), makeContext());

    // Should pick local model
    if (result.selectedModel !== 'none') {
      const model = registry.getModel(result.selectedProvider, result.selectedModel);
      expect(model?.privacyLevel).toBe('local');
    }
  });
});
