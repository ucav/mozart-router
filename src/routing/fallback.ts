import { RouteDecision, TaskProfile, Model } from '../types';

export type FallbackEvent = 'provider_unavailable' | 'quota_exceeded' | 'timeout' | 'rate_limit' | 'server_error' | 'invalid_response' | 'latency_high' | 'cost_too_high';

export interface FallbackResult {
  success: boolean;
  route: RouteDecision;
  attempt: number;
  events: FallbackEvent[];
  totalTimeMs: number;
  error?: string;
}

export class FallbackManager {
  private maxRetries: number;
  private backoffMs: number;
  private maxBackoffMs: number;

  constructor(options?: { maxRetries?: number; backoffMs?: number; maxBackoffMs?: number }) {
    this.maxRetries = options?.maxRetries ?? 3;
    this.backoffMs = options?.backoffMs ?? 500;
    this.maxBackoffMs = options?.maxBackoffMs ?? 10000;
  }

  async execute(
    primaryRoute: RouteDecision,
    fallbacks: RouteDecision[],
    executor: (route: RouteDecision) => Promise<{ success: boolean; event?: FallbackEvent }>,
  ): Promise<FallbackResult> {
    const start = Date.now();
    const events: FallbackEvent[] = [];
    const allRoutes = [primaryRoute, ...fallbacks];

    for (let i = 0; i < allRoutes.length && i <= this.maxRetries; i++) {
      const route = allRoutes[i];
      const result = await executor(route);

      if (result.success) {
        return {
          success: true,
          route,
          attempt: i + 1,
          events,
          totalTimeMs: Date.now() - start,
        };
      }

      if (result.event) {
        events.push(result.event);
      } else {
        events.push('server_error');
      }

      if (i < allRoutes.length - 1 && i < this.maxRetries) {
        const delay = Math.min(
          this.backoffMs * Math.pow(2, i),
          this.maxBackoffMs,
        );
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      route: primaryRoute,
      attempt: allRoutes.length,
      events,
      totalTimeMs: Date.now() - start,
      error: `All ${allRoutes.length} routes exhausted. Events: ${events.join(', ')}`,
    };
  }

  getFallbackCandidates(
    primaryRoute: RouteDecision,
    task: TaskProfile,
    event: FallbackEvent,
  ): RouteDecision[] {
    if (event === 'cost_too_high') {
      return primaryRoute.fallbacks.filter((f) => f.estimatedCost < primaryRoute.estimatedCost);
    }
    if (event === 'latency_high') {
      return primaryRoute.fallbacks;
    }
    if (event === 'quota_exceeded' || event === 'provider_unavailable' || event === 'server_error') {
      return primaryRoute.fallbacks;
    }
    return primaryRoute.fallbacks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
