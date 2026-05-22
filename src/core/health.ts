import { CircuitBreaker } from '../routing/circuit-breaker';
import { GatewayAdapter, ConnectionStatus } from '../types';

export interface HealthCheckResult {
  adapterId: string;
  adapterName: string;
  status: ConnectionStatus;
  lastCheck: string;
  consecutiveFailures: number;
  circuitState: 'closed' | 'open' | 'half_open';
}

export class HealthChecker {
  private adapters: GatewayAdapter[] = [];
  private breakers: Map<string, CircuitBreaker> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs: number;

  constructor(options?: { checkIntervalMs?: number }) {
    this.checkIntervalMs = options?.checkIntervalMs ?? 60000;
  }

  register(adapter: GatewayAdapter, breakerConfig?: { failureThreshold?: number; recoveryTimeoutMs?: number }): void {
    this.adapters.push(adapter);
    if (!this.breakers.has(adapter.id)) {
      this.breakers.set(adapter.id, new CircuitBreaker(breakerConfig));
    }
  }

  start(): void {
    if (this.intervalId) return;
    this.checkAll();
    this.intervalId = setInterval(() => this.checkAll(), this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkAll(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    for (const adapter of this.adapters) {
      const result = await this.checkOne(adapter);
      this.results.set(adapter.id, result);
      results.push(result);
    }
    return results;
  }

  private async checkOne(adapter: GatewayAdapter): Promise<HealthCheckResult> {
    const breaker = this.breakers.get(adapter.id)!;
    let status: ConnectionStatus = { connected: false, error: 'Not checked' };

    try {
      if (adapter.testConnection) {
        status = await adapter.testConnection();
      } else {
        const detection = await adapter.detect();
        status = {
          connected: detection.detected && detection.status === 'active',
          error: detection.detected ? undefined : detection.details[0],
        };
      }
    } catch (err) {
      status = { connected: false, error: String(err) };
    }

    if (!status.connected) {
      try {
        await breaker.call(async () => { throw new Error('Health check failed'); });
      } catch { /* breaker tracks failures */ }
    } else {
      breaker.reset();
    }

    const prev = this.results.get(adapter.id);
    const consecutiveFailures = !status.connected
      ? (prev?.consecutiveFailures ?? 0) + 1
      : 0;

    return {
      adapterId: adapter.id,
      adapterName: adapter.name,
      status,
      lastCheck: new Date().toISOString(),
      consecutiveFailures,
      circuitState: breaker.getState(),
    };
  }

  getStatus(adapterId: string): HealthCheckResult | undefined {
    return this.results.get(adapterId);
  }

  getAllStatus(): HealthCheckResult[] {
    return Array.from(this.results.values());
  }

  getBreaker(adapterId: string): CircuitBreaker | undefined {
    return this.breakers.get(adapterId);
  }
}
