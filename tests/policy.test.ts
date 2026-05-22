import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../src/policy/engine';
import { TaskProfile, PrivacyDecision } from '../src/types';

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

function makePrivacy(action: PrivacyDecision['action'] = 'allow'): PrivacyDecision {
  return {
    allowed: action === 'allow',
    mode: 'balanced',
    findings: [],
    action,
    explanation: [],
  };
}

describe('PolicyEngine', () => {
  it('uses default config', () => {
    const engine = new PolicyEngine();
    expect(engine.config.mode).toBe('local_first');
    expect(engine.config.budget.dailyLimitUsd).toBe(5);
  });

  it('allows normal tasks without restrictions', () => {
    const engine = new PolicyEngine();
    const result = engine.evaluate(makeTask(), makePrivacy());
    expect(result.allowCloud).toBe(true);
    expect(result.requireLocal).toBe(false);
  });

  it('blocks cloud for local_only privacy mode', () => {
    const engine = new PolicyEngine();
    const result = engine.evaluate(makeTask(), makePrivacy(), 'balanced', 'local_only');
    expect(result.requireLocal).toBe(true);
    expect(result.allowCloud).toBe(false);
  });

  it('blocks cloud when privacy action is block_cloud', () => {
    const engine = new PolicyEngine();
    const result = engine.evaluate(makeTask(), makePrivacy('block_cloud'));
    expect(result.allowCloud).toBe(false);
  });

  it('prefers cheap in lowest budget mode', () => {
    const engine = new PolicyEngine();
    const result = engine.evaluate(makeTask(), makePrivacy(), 'lowest');
    expect(result.preferCheap).toBe(true);
  });

  it('respects max cost limit', () => {
    const engine = new PolicyEngine({
      budget: { dailyLimitUsd: 2, warnAtPercent: 80, mode: 'lowest' },
    });
    const result = engine.evaluate(makeTask(), makePrivacy());
    expect(result.maxCost).toBe(2);
  });

  it('custom config overrides defaults', () => {
    const engine = new PolicyEngine({
      mode: 'privacy_first',
      privacy: {
        mode: 'local_only',
        secrets: 'local_only',
        envFiles: 'block_cloud',
        customerData: 'trusted_only',
      },
    });
    expect(engine.config.mode).toBe('privacy_first');
    const result = engine.evaluate(makeTask(), makePrivacy());
    expect(result.requireLocal).toBe(true);
  });
});
