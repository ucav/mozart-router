import { describe, it, expect } from 'vitest';
import { HealthChecker } from '../src/core/health';
import { GatewayAdapter, DetectionResult, Provider, Model } from '../src/types';

class TestAdapter implements GatewayAdapter {
  id = 'test-adapter';
  name = 'Test Adapter';
  private shouldFail: boolean;
  constructor(shouldFail = false) { this.shouldFail = shouldFail; }
  async detect(): Promise<DetectionResult> {
    return { detected: !this.shouldFail, gatewayId: this.id, gatewayName: this.name, status: this.shouldFail ? 'unavailable' : 'active', providersCount: 1, modelsCount: 1, details: [] };
  }
  async listProviders(): Promise<Provider[]> { return []; }
  async listModels(): Promise<Model[]> { return []; }
}

describe('HealthChecker', () => {
  it('checks healthy adapter', async () => {
    const checker = new HealthChecker();
    const adapter = new TestAdapter(false);
    checker.register(adapter);
    const results = await checker.checkAll();
    expect(results.length).toBe(1);
    expect(results[0].status.connected).toBe(true);
    expect(results[0].consecutiveFailures).toBe(0);
  });

  it('checks unhealthy adapter', async () => {
    const checker = new HealthChecker();
    const adapter = new TestAdapter(true);
    checker.register(adapter);
    const results = await checker.checkAll();
    expect(results[0].status.connected).toBe(false);
    expect(results[0].consecutiveFailures).toBe(1);
  });

  it('tracks consecutive failures across checks', async () => {
    const checker = new HealthChecker();
    const adapter = new TestAdapter(true);
    checker.register(adapter);
    await checker.checkAll();
    const results = await checker.checkAll();
    expect(results[0].consecutiveFailures).toBe(2);
  });
});
