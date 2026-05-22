import { describe, it, expect } from 'vitest';
import { Mozart } from '../src/core/mozart';
import { Model } from '../src/types';

describe('RecommendOnlyMode', () => {
  it('recommend returns a route without executing', async () => {
    const mozart = new Mozart();

    // Add some test models
    mozart.registry.addProvider({
      id: 'test',
      name: 'Test Provider',
      source: 'manual',
      privacyLevel: 'cloud',
      status: 'available',
      lastCheckedAt: new Date().toISOString(),
    });

    mozart.registry.addModel({
      id: 'test-model',
      providerId: 'test',
      displayName: 'Test Model',
      modality: ['text'],
      contextWindow: 8192,
      inputPrice: 1.0,
      outputPrice: 2.0,
      latencyClass: 'medium',
      qualityClass: 'high',
      strengths: ['coding'],
      weaknesses: [],
      supportsTools: true,
      privacyLevel: 'cloud',
      availability: 'available',
      sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    });

    const result = await mozart.recommend('write a function to sort an array');
    expect(result).toBeDefined();
    expect(result.selectedModel).toBe('test-model');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('process returns explanation in recommend mode', async () => {
    const mozart = new Mozart();

    mozart.registry.addProvider({
      id: 'test',
      name: 'Test Provider',
      source: 'manual',
      privacyLevel: 'cloud',
      status: 'available',
      lastCheckedAt: new Date().toISOString(),
    });

    mozart.registry.addModel({
      id: 'test-model',
      providerId: 'test',
      displayName: 'Test Model',
      modality: ['text'],
      contextWindow: 8192,
      inputPrice: 1.0,
      outputPrice: 2.0,
      latencyClass: 'medium',
      qualityClass: 'high',
      strengths: ['coding'],
      weaknesses: [],
      privacyLevel: 'cloud',
      availability: 'available',
      sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    });

    const response = await mozart.process({
      input: 'write a function to sort an array',
      executionMode: 'recommend',
    });

    expect(response.route).toBeDefined();
    expect(response.cost).toBeDefined();
    expect(response.explanation.length).toBeGreaterThan(0);
    expect(response.privacy).toBeDefined();
  });

  it('simulate provides detailed route information', async () => {
    const mozart = new Mozart();

    mozart.registry.addProvider({
      id: 'test',
      name: 'Test Provider',
      source: 'manual',
      privacyLevel: 'cloud',
      status: 'available',
      lastCheckedAt: new Date().toISOString(),
    });

    mozart.registry.addModel({
      id: 'test-model',
      providerId: 'test',
      displayName: 'Test Model',
      modality: ['text'],
      contextWindow: 8192,
      inputPrice: 1.0,
      outputPrice: 2.0,
      latencyClass: 'medium',
      qualityClass: 'high',
      strengths: ['coding'],
      weaknesses: [],
      privacyLevel: 'cloud',
      availability: 'available',
      sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    });

    const result = await mozart.simulate('debug the build error');
    expect(result.selectedModel).toBeDefined();
    expect(result.estimatedCost).toBeDefined();
    expect(result.contextStrategy).toBeDefined();
  });
});
