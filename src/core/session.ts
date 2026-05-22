import { RouteDecision } from '../types';

export class SessionTracker {
  private routes: RouteDecision[] = [];
  private startTime: string;
  private premiumCallsAvoided = 0;
  private providerFailuresRecovered = 0;
  private sensitiveFilesKeptLocal = 0;

  constructor() {
    this.startTime = new Date().toISOString();
  }

  recordRoute(route: RouteDecision): void {
    this.routes.push(route);
  }

  recordPremiumAvoided(): void {
    this.premiumCallsAvoided++;
  }

  recordFailureRecovered(): void {
    this.providerFailuresRecovered++;
  }

  recordSensitiveFileKeptLocal(): void {
    this.sensitiveFilesKeptLocal++;
  }

  generateReport(): string {
    const totalTokensOptimized = this.routes.reduce(
      (sum, r) => sum + r.estimatedTokens.input,
      0,
    );

    let savingsPercent = 0;
    if (this.routes.length > 0) {
      const avgSavings =
        this.routes.reduce((sum, r) => {
          if (r.fallbacks.length > 0) {
            const premiumCost = r.fallbacks[0]?.estimatedCost ?? r.estimatedCost * 2;
            return sum + ((premiumCost - r.estimatedCost) / premiumCost) * 100;
          }
          return sum + 40; // default estimate 40% savings vs premium
        }, 0) / this.routes.length;
      savingsPercent = Math.round(avgSavings);
    }

    const lines = [
      `Session report:`,
      `  - ${this.routes.length} requests routed`,
      `  - ${totalTokensOptimized.toLocaleString()} tokens optimized`,
      `  - ${this.premiumCallsAvoided} premium calls avoided`,
      `  - estimated savings: ${savingsPercent}%`,
      `  - ${this.providerFailuresRecovered} provider failures recovered`,
      `  - ${this.sensitiveFilesKeptLocal} sensitive files kept local`,
    ];
    return lines.join('\n');
  }

  explainLast(): string {
    if (this.routes.length === 0) {
      return 'No routing decisions recorded yet.';
    }
    const last = this.routes[this.routes.length - 1];
    return last.explanation.join('\n');
  }

  reset(): void {
    this.routes = [];
    this.startTime = new Date().toISOString();
    this.premiumCallsAvoided = 0;
    this.providerFailuresRecovered = 0;
    this.sensitiveFilesKeptLocal = 0;
  }
}
