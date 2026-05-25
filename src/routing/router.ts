import {
  TaskProfile,
  PrivacyDecision,
  RouteDecision,
  ContextStrategy,
  TokenUsage,
} from '../types';
import { InventoryRegistry } from '../core/inventory';
import { PolicyEngine } from '../policy/engine';
import { CostEstimator } from '../cost/estimator';
import { RoutingScorer } from './scorer';

export interface PolicyEvalResult {
  allowedProviders: string[];
  blockedProviders: string[];
  requireLocal: boolean;
  preferCheap: boolean;
  allowCloud: boolean;
  maxCost: number;
}

export class RoutingEngine {
  private scorer: RoutingScorer;

  constructor(
    private registry: InventoryRegistry,
    private policy: PolicyEngine,
    private costEstimator: CostEstimator,
  ) {
    this.scorer = new RoutingScorer();
  }

  route(
    profile: TaskProfile,
    privacy: PrivacyDecision,
    policyEval: PolicyEvalResult,
    contextStrategy: ContextStrategy,
  ): RouteDecision {
    const models = this.registry.listModels();

    if (models.length === 0) {
      return this.buildDefaultRoute(profile, contextStrategy);
    }

    // Filter models
    const candidates = models.filter((m) => {
      if (privacy.action === 'local_only' && m.privacyLevel !== 'local') return false;
      if (privacy.action === 'block_cloud' && m.privacyLevel === 'cloud') return false;
      if (policyEval.blockedProviders.includes(m.providerId)) return false;
      if (policyEval.requireLocal && m.privacyLevel !== 'local') return false;
      if (profile.requiresLongContext && m.contextWindow && m.contextWindow < 32000) return false;
      if (profile.requiresTools && m.supportsTools === false) return false;
      if (profile.requiresJson && m.supportsJsonMode === false) return false;
      if (profile.requiresVision && !m.modality.includes('vision') && !m.modality.includes('multimodal')) return false;
      if (profile.requiresCodeStrength && m.qualityClass === 'low') return false;
      return true;
    });

    if (candidates.length === 0) {
      return this.buildDefaultRoute(profile, contextStrategy);
    }

    // Score all candidates
    const scores = candidates.map((m) =>
      this.scorer.score(m, profile, {
        cheapFirst: this.policy.config.routing.cheapFirst,
        preferLocal: this.policy.config.routing.preferLocalForSimpleTasks,
      }),
    );

    // Sort by total score descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    const top = scores[0];
    const fallbacks = scores.slice(1, Math.min(3, scores.length)).map((s) => ({
      selectedGateway: s.gatewayId,
      selectedProvider: s.providerId,
      selectedModel: s.modelId,
      score: s.totalScore,
      confidence: s.totalScore * 0.8,
      contextStrategy: contextStrategy.action,
      estimatedCost: this.costEstimator.estimateCostForModel(
        this.registry.getModel(s.providerId, s.modelId) ?? null,
        contextStrategy.estimatedInputTokens,
      ),
      estimatedTokens: {
        input: contextStrategy.estimatedInputTokens,
        output: Math.ceil(contextStrategy.estimatedInputTokens * 0.3),
        total: 0,
      },
      fallbacks: [],
      explanation: s.explanation,
    }));

    fallbacks.forEach((fb) => {
      fb.estimatedTokens.total = fb.estimatedTokens.input + fb.estimatedTokens.output;
    });

    const estimatedCost = this.costEstimator.estimateCostForModel(
      this.registry.getModel(top.providerId, top.modelId) ?? null,
      contextStrategy.estimatedInputTokens,
    );

    const estimatedTokens: TokenUsage = {
      input: contextStrategy.estimatedInputTokens,
      output: Math.ceil(contextStrategy.estimatedInputTokens * 0.3),
      total: 0,
    };
    estimatedTokens.total = estimatedTokens.input + estimatedTokens.output;

    return {
      selectedGateway: top.gatewayId,
      selectedProvider: top.providerId,
      selectedModel: top.modelId,
      score: top.totalScore,
      confidence: top.totalScore * 0.9,
      contextStrategy: contextStrategy.action,
      estimatedCost,
      estimatedTokens,
      fallbacks,
      explanation: [
        `Task: ${profile.taskType} (complexity: ${profile.complexity}, context: ${profile.contextNeed})`,
        `Selected: ${top.gatewayId ? top.gatewayId + ' -> ' : ''}${top.providerId}/${top.modelId} (score: ${top.totalScore})`,
        ...top.explanation,
        `Fallbacks: ${fallbacks.map((f) => f.selectedModel).join(', ')}`,
      ],
    };
  }

  private buildDefaultRoute(profile: TaskProfile, contextStrategy: ContextStrategy): RouteDecision {
    const tokens: TokenUsage = {
      input: contextStrategy.estimatedInputTokens,
      output: Math.ceil(contextStrategy.estimatedInputTokens * 0.3),
      total: 0,
    };
    tokens.total = tokens.input + tokens.output;

    return {
      selectedGateway: undefined,
      selectedProvider: 'none',
      selectedModel: 'none',
      score: 0,
      confidence: 0,
      contextStrategy: 'send_all',
      estimatedCost: 0,
      estimatedTokens: tokens,
      fallbacks: [],
      explanation: [
        `Task: ${profile.taskType} — no models available in inventory.`,
        'Run `mozart doctor` to detect available gateways and providers.',
        'Or add models manually via adapter configuration.',
      ],
    };
  }
}
