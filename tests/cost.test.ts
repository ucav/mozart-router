import { describe, it, expect } from 'vitest';
import { CostEstimator } from '../src/cost/estimator';
import { Model, RouteDecision, ContextStrategy } from '../src/types';

describe('CostEstimator', () => {
  const estimator = new CostEstimator();

  it('estimates cost from model pricing', () => {
    const model: Model = {
      id: 'gpt-4',
      providerId: 'openai',
      displayName: 'GPT-4',
      modality: ['text'],
      contextWindow: 8192,
      inputPrice: 10,
      outputPrice: 30,
      latencyClass: 'medium',
      qualityClass: 'premium',
      strengths: [],
      weaknesses: [],
      privacyLevel: 'cloud',
      availability: 'available',
      sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    };

    const cost = estimator.estimateCostForModel(model, 1000);
    expect(cost).toBeGreaterThan(0);
  });

  it('returns zero cost for local models', () => {
    const model: Model = {
      id: 'llama',
      providerId: 'ollama',
      displayName: 'Llama 3',
      modality: ['text'],
      inputPrice: 0,
      outputPrice: 0,
      latencyClass: 'fast',
      qualityClass: 'medium',
      strengths: [],
      weaknesses: [],
      privacyLevel: 'local',
      availability: 'available',
      sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    };

    const cost = estimator.estimateCostForModel(model, 1000);
    expect(cost).toBe(0);
  });

  it('estimates tokens from text', () => {
    const text = 'Hello world, this is a test sentence.';
    const tokens = estimator.estimateTokens(text);
    expect(tokens.input).toBeGreaterThan(0);
    expect(tokens.output).toBeGreaterThan(0);
    expect(tokens.total).toBe(tokens.input + tokens.output);
  });

  it('estimates route with savings', () => {
    const route: RouteDecision = {
      selectedProvider: 'test',
      selectedModel: 'cheap-model',
      score: 0.8,
      confidence: 0.9,
      contextStrategy: 'send_all',
      estimatedCost: 0.01,
      estimatedTokens: { input: 1000, output: 300, total: 1300 },
      fallbacks: [
        {
          selectedProvider: 'test',
          selectedModel: 'expensive-model',
          score: 0.7,
          confidence: 0.8,
          contextStrategy: 'send_all',
          estimatedCost: 0.05,
          estimatedTokens: { input: 1000, output: 300, total: 1300 },
          fallbacks: [],
          explanation: [],
        },
      ],
      explanation: [],
    };

    const cost = estimator.estimate(route, {
      action: 'send_all',
      estimatedInputTokens: 1000,
      maxTokens: 8000,
      instructions: [],
    });

    expect(cost.totalCost).toBeGreaterThan(0);
  });

  it('calculates savings percentage', () => {
    const savings = estimator.calculateSavings(0.01, 0.05);
    expect(savings).toBe(80);
  });
});
