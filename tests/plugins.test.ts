import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../src/core/plugins';
import { GatewayAdapter, DetectionResult, Provider, Model } from '../src/types';

class FakeAdapter implements GatewayAdapter {
  id = 'fake'; name = 'Fake';
  async detect(): Promise<DetectionResult> { return { detected: true, gatewayId: 'fake', gatewayName: 'Fake', status: 'active', providersCount: 1, modelsCount: 1, details: [] }; }
  async listProviders(): Promise<Provider[]> { return []; }
  async listModels(): Promise<Model[]> { return []; }
}

describe('PluginRegistry', () => {
  it('registers and retrieves plugins', () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'test-plugin', version: '1.0.0',
      adapters: [new FakeAdapter()],
    });
    const plugin = registry.get('test-plugin');
    expect(plugin).toBeDefined();
    expect(plugin?.adapters.length).toBe(1);
  });

  it('lists all plugins', () => {
    const registry = new PluginRegistry();
    registry.register({ name: 'a', version: '1.0.0', adapters: [] });
    registry.register({ name: 'b', version: '1.0.0', adapters: [] });
    expect(registry.list().length).toBe(2);
  });

  it('returns all adapters from all plugins', () => {
    const registry = new PluginRegistry();
    registry.register({ name: 'p1', version: '1.0.0', adapters: [new FakeAdapter()] });
    registry.register({ name: 'p2', version: '1.0.0', adapters: [new FakeAdapter(), new FakeAdapter()] });
    const adapters = registry.getAllAdapters();
    expect(adapters.length).toBe(3);
  });
});
