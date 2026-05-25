import { Model, TaskProfile, RoutingScore } from '../types';

export class RoutingScorer {
  score(
    model: Model,
    profile: TaskProfile,
    policyPreferences: { cheapFirst: boolean; preferLocal: boolean },
  ): RoutingScore {
    const explanation: string[] = [];

    // Quality score (0-1)
    let qualityScore = 0.5;
    const qualityMap: Record<string, number> = {
      'low': 0.2,
      'medium': 0.5,
      'high': 0.8,
      'premium': 0.95,
      'unknown': 0.5,
    };
    qualityScore = qualityMap[model.qualityClass] ?? 0.5;

    if (profile.requiresCodeStrength && model.strengths.includes('coding')) {
      qualityScore += 0.15;
      explanation.push(`+quality: model strong at coding for ${profile.taskType}`);
    }
    if (profile.requiresReasoning && model.strengths.includes('reasoning')) {
      qualityScore += 0.1;
      explanation.push('+quality: model supports reasoning');
    }
    qualityScore = Math.min(qualityScore, 1.0);

    // Cost score (0-1, higher = cheaper)
    let costScore = 0.5;
    if (model.inputPrice !== undefined) {
      if (model.inputPrice === 0 || model.privacyLevel === 'local') {
        costScore = 1.0;
        explanation.push('+cost: free or local model');
      } else if (model.inputPrice < 0.5) {
        costScore = 0.85;
        explanation.push('+cost: low-cost model');
      } else if (model.inputPrice < 2.0) {
        costScore = 0.6;
      } else if (model.inputPrice < 5.0) {
        costScore = 0.35;
        explanation.push('-cost: medium-high price');
      } else {
        costScore = 0.1;
        explanation.push('-cost: expensive model');
      }
    }

    // Latency score
    let latencyScore = 0.5;
    const latencyMap: Record<string, number> = {
      'fast': 0.9,
      'medium': 0.6,
      'slow': 0.2,
      'unknown': 0.5,
    };
    latencyScore = latencyMap[model.latencyClass] ?? 0.5;

    // Privacy score
    let privacyScore = 0.5;
    if (model.privacyLevel === 'local') {
      privacyScore = 1.0;
      explanation.push('+privacy: local model, data stays on-device');
    } else if (model.privacyLevel === 'cloud') {
      privacyScore = 0.3;
      explanation.push('-privacy: cloud model');
    }

    // Context score
    let contextScore = 0.5;
    if (model.contextWindow) {
      if (model.contextWindow > 100000) {
        contextScore = 0.95;
        explanation.push('+context: large context window');
      } else if (model.contextWindow > 32000) {
        contextScore = 0.7;
      } else if (model.contextWindow < 8000) {
        contextScore = 0.3;
        explanation.push('-context: small context window');
      }
    }

    // Reliability score
    let reliabilityScore = 0.7;
    if (model.sourceConfidence === 'high') reliabilityScore = 0.9;
    else if (model.sourceConfidence === 'low') reliabilityScore = 0.4;

    // Quota score
    let quotaScore = 0.8;
    if (model.availability === 'available') quotaScore = 0.9;
    else if (model.availability === 'limited') quotaScore = 0.5;

    // Apply policy preferences
    const weights = {
      quality: profile.costPreference === 'quality' ? 0.35 : profile.costPreference === 'balanced' ? 0.25 : 0.15,
      cost: profile.costPreference === 'lowest' || policyPreferences.cheapFirst ? 0.35 : profile.costPreference === 'balanced' ? 0.25 : 0.1,
      latency: profile.latencyPreference === 'fast' ? 0.2 : profile.latencyPreference === 'balanced' ? 0.1 : 0.05,
      privacy: profile.privacyNeed === 'local_only' || profile.privacyNeed === 'high' || policyPreferences.preferLocal ? 0.25 : 0.1,
      context: profile.contextNeed === 'very_high' ? 0.15 : 0.05,
      reliability: 0.05,
      quota: 0.05,
    };

    const totalScore =
      qualityScore * weights.quality +
      costScore * weights.cost +
      latencyScore * weights.latency +
      privacyScore * weights.privacy +
      contextScore * weights.context +
      reliabilityScore * weights.reliability +
      quotaScore * weights.quota;

    // Normalize
    const normalizedScore = totalScore / Object.values(weights).reduce((a, b) => a + b, 0);

    return {
      modelId: model.id,
      providerId: model.providerId,
      gatewayId: model.gatewayId,
      totalScore: Math.round(normalizedScore * 1000) / 1000,
      qualityScore: Math.round(qualityScore * 100) / 100,
      costScore: Math.round(costScore * 100) / 100,
      latencyScore: Math.round(latencyScore * 100) / 100,
      privacyScore: Math.round(privacyScore * 100) / 100,
      contextScore: Math.round(contextScore * 100) / 100,
      reliabilityScore: Math.round(reliabilityScore * 100) / 100,
      quotaScore: Math.round(quotaScore * 100) / 100,
      explanation,
    };
  }
}
