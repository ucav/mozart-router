import { HealthCheckResult } from './health';

// Provider reliability scoring — learns from health check history.
// Tracks uptime, latency, error rate per provider and computes trust scores.

export interface ProviderReliability {
  providerId: string;
  totalChecks: number;
  successes: number;
  failures: number;
  avgLatencyMs: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  uptimePercent: number;
  trustScore: number; // 0-1, higher = more reliable
  streak: number; // consecutive successes (positive) or failures (negative)
}

export class ReliabilityTracker {
  private providers: Map<string, ProviderReliability> = new Map();

  record(healthResult: HealthCheckResult): void {
    const key = healthResult.adapterId;
    let entry = this.providers.get(key);

    if (!entry) {
      entry = {
        providerId: key,
        totalChecks: 0,
        successes: 0,
        failures: 0,
        avgLatencyMs: 0,
        uptimePercent: 100,
        trustScore: 0.7,
        streak: 0,
      };
      this.providers.set(key, entry);
    }

    entry.totalChecks++;

    if (healthResult.status.connected) {
      entry.successes++;
      entry.lastSuccessAt = new Date().toISOString();
      if (healthResult.status.latencyMs) {
        entry.avgLatencyMs =
          (entry.avgLatencyMs * (entry.successes - 1) + healthResult.status.latencyMs) /
          entry.successes;
      }
      if (entry.streak < 0) entry.streak = 1;
      else entry.streak++;
    } else {
      entry.failures++;
      entry.lastFailureAt = new Date().toISOString();
      if (entry.streak > 0) entry.streak = -1;
      else entry.streak--;
    }

    entry.uptimePercent = Math.round((entry.successes / entry.totalChecks) * 100);
    entry.trustScore = this.computeTrust(entry);
  }

  private computeTrust(r: ProviderReliability): number {
    const uptimeWeight = (r.uptimePercent / 100) * 0.4;
    const streakWeight =
      r.streak > 0
        ? Math.min(r.streak / 10, 1) * 0.3
        : Math.max(0, 1 + r.streak / 10) * 0.3;
    const recencyWeight = r.lastSuccessAt ? 0.3 : 0;
    const latencyWeight =
      r.avgLatencyMs > 0 ? Math.max(0, 1 - r.avgLatencyMs / 5000) * 0 : 0; // neutral for now

    return Math.round((uptimeWeight + streakWeight + recencyWeight + latencyWeight) * 1000) / 1000;
  }

  get(providerId: string): ProviderReliability | undefined {
    return this.providers.get(providerId);
  }

  getAll(): ProviderReliability[] {
    return Array.from(this.providers.values()).sort(
      (a, b) => b.trustScore - a.trustScore,
    );
  }

  getTrustiest(count = 3): ProviderReliability[] {
    return this.getAll().slice(0, count);
  }

  reset(): void {
    this.providers.clear();
  }
}
