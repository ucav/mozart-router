import { RouteDecision, CostEstimate, TokenUsage, ContextStrategy, Model } from '../types';

export class CostEstimator {
  estimate(route: RouteDecision, contextStrategy: ContextStrategy): CostEstimate {
    const inputCost = route.estimatedCost * 0.3;
    const outputCost = route.estimatedCost * 0.7;
    let savingsPercentage: number | undefined;

    if (route.estimatedCost > 0 && route.fallbacks.length > 0) {
      const premiumCost = route.fallbacks[0].estimatedCost * 1.5;
      if (premiumCost > route.estimatedCost) {
        savingsPercentage = Math.round((1 - route.estimatedCost / premiumCost) * 100);
      }
    }

    return {
      inputCost: Math.round(inputCost * 10000) / 10000,
      outputCost: Math.round(outputCost * 10000) / 10000,
      totalCost: Math.round(route.estimatedCost * 10000) / 10000,
      currency: 'USD',
      savingsPercentage,
      comparedToPremium: route.fallbacks[0]?.estimatedCost
        ? Math.round(route.fallbacks[0].estimatedCost * 10000) / 10000
        : undefined,
    };
  }

  estimateCostForModel(model: Model | null, inputTokens: number): number {
    if (!model || model.inputPrice === undefined) {
      // Default estimate
      return Math.round(inputTokens / 1000 * 0.002 * 10000) / 10000;
    }

    const outputTokens = Math.ceil(inputTokens * 0.3);
    const inputCost = (inputTokens / 1000) * (model.inputPrice / 1000);
    const outputCost = (outputTokens / 1000) * ((model.outputPrice ?? model.inputPrice * 2) / 1000);

    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }

  estimateTokens(text: string): TokenUsage {
    const input = Math.ceil(text.length / 4);
    const output = Math.ceil(input * 0.3);
    return { input, output, total: input + output };
  }

  calculateSavings(actualCost: number, premiumCost: number): number {
    if (premiumCost <= 0) return 0;
    return Math.round((1 - actualCost / premiumCost) * 100);
  }
}
