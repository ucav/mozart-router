import { describe, it, expect } from 'vitest';
import { InventoryRegistry } from '../src/core/inventory';
import { Provider, Model } from '../src/types';

function makeProvider(id: string, overrides: Partial<Provider> = {}): Provider {
  return {
    id,
    name: `Provider ${id}`,
    source: 'manual',
    privacyLevel: 'cloud',
    status: 'available',
    lastCheckedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeModel(providerId: string, id: string, overrides: Partial<Model> = {}): Model {
  return {
    id,
    providerId,
    displayName: id,
    modality: ['text'],
    contextWindow: 8192,
    latencyClass: 'medium',
    qualityClass: 'medium',
    strengths: [],
    weaknesses: [],
    privacyLevel: 'cloud',
    availability: 'available',
    sourceConfidence: 'medium',
    lastCheckedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('InventoryRegistry', () => {
  it('adds and retrieves providers', () => {
    const registry = new InventoryRegistry();
    registry.addProvider(makeProvider('openai'));
    expect(registry.getProvider('openai')).toBeDefined();
    expect(registry.getProvider('openai')?.name).toBe('Provider openai');
  });

  it('adds and retrieves models', () => {
    const registry = new InventoryRegistry();
    registry.addModel(makeModel('openai', 'gpt-4'));
    const model = registry.getModel('openai', 'gpt-4');
    expect(model).toBeDefined();
    expect(model?.displayName).toBe('gpt-4');
  });

  it('lists all providers', () => {
    const registry = new InventoryRegistry();
    registry.addProvider(makeProvider('a'));
    registry.addProvider(makeProvider('b'));
    expect(registry.listProviders()).toHaveLength(2);
  });

  it('lists all models', () => {
    const registry = new InventoryRegistry();
    registry.addModel(makeModel('a', 'm1'));
    registry.addModel(makeModel('a', 'm2'));
    registry.addModel(makeModel('b', 'm3'));
    expect(registry.listModels()).toHaveLength(3);
  });

  it('filters models by provider', () => {
    const registry = new InventoryRegistry();
    registry.addModel(makeModel('a', 'm1'));
    registry.addModel(makeModel('a', 'm2'));
    registry.addModel(makeModel('b', 'm3'));
    expect(registry.listModels({ providerId: 'a' })).toHaveLength(2);
  });

  it('merges from adapter correctly', () => {
    const registry = new InventoryRegistry();
    const providers = [makeProvider('p1'), makeProvider('p2')];
    const models = [makeModel('p1', 'm1'), makeModel('p2', 'm2')];

    registry.mergeFromAdapter('test-adapter', providers, models);

    expect(registry.listProviders()).toHaveLength(2);
    expect(registry.listModels()).toHaveLength(2);
    // Models should have gatewayId set
    expect(registry.listModels()[0].gatewayId).toBe('test-adapter');
  });

  it('does not duplicate models on merge', () => {
    const registry = new InventoryRegistry();
    registry.addModel(makeModel('p1', 'm1', { displayName: 'original' }));

    const models = [makeModel('p1', 'm1', { displayName: 'updated' })];
    registry.mergeFromAdapter('test', [], models);

    expect(registry.listModels()).toHaveLength(1);
    expect(registry.getModel('p1', 'm1')?.displayName).toBe('updated');
  });

  it('generates snapshot', () => {
    const registry = new InventoryRegistry();
    registry.addProvider(makeProvider('p1'));
    registry.addModel(makeModel('p1', 'm1'));

    const snapshot = registry.snapshot();
    expect(snapshot.providers).toHaveLength(1);
    expect(snapshot.models).toHaveLength(1);
    expect(snapshot.source).toBe('hybrid');
    expect(snapshot.generatedAt).toBeDefined();
  });

  it('clears all data', () => {
    const registry = new InventoryRegistry();
    registry.addProvider(makeProvider('p1'));
    registry.addModel(makeModel('p1', 'm1'));
    registry.clear();
    expect(registry.listProviders()).toHaveLength(0);
    expect(registry.listModels()).toHaveLength(0);
  });
});
