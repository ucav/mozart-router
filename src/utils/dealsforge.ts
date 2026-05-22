import { InventoryRegistry } from '../core/inventory';
import { Provider, Model } from '../types';

const DEALSFORGE_MODELS: Array<Partial<Model> & { providerId: string }> = [
  {
    providerId: 'openrouter',
    id: 'openai/gpt-4o',
    displayName: 'GPT-4o',
    family: 'gpt-4',
    contextWindow: 128000,
    inputPrice: 2.5,
    outputPrice: 10.0,
    latencyClass: 'medium',
    qualityClass: 'premium',
    modality: ['text', 'vision', 'multimodal'],
    strengths: ['general', 'coding', 'vision', 'tools'],
    supportsTools: true,
    supportsJsonMode: true,
    privacyLevel: 'cloud',
  },
  {
    providerId: 'openrouter',
    id: 'openai/gpt-4.1-nano',
    displayName: 'GPT-4.1 Nano',
    family: 'gpt-4',
    contextWindow: 1000000,
    inputPrice: 0.1,
    outputPrice: 0.4,
    latencyClass: 'fast',
    qualityClass: 'medium',
    modality: ['text'],
    strengths: ['cheap', 'long_context'],
    privacyLevel: 'cloud',
  },
  {
    providerId: 'openrouter',
    id: 'anthropic/claude-haiku-3.5',
    displayName: 'Claude Haiku 3.5',
    family: 'claude',
    contextWindow: 200000,
    inputPrice: 0.8,
    outputPrice: 4.0,
    latencyClass: 'fast',
    qualityClass: 'high',
    modality: ['text', 'vision'],
    strengths: ['coding', 'fast', 'tools'],
    supportsTools: true,
    privacyLevel: 'cloud',
  },
  {
    providerId: 'openrouter',
    id: 'deepseek/deepseek-r1',
    displayName: 'DeepSeek R1',
    family: 'deepseek',
    contextWindow: 65536,
    inputPrice: 0.55,
    outputPrice: 2.19,
    latencyClass: 'medium',
    qualityClass: 'high',
    modality: ['text'],
    strengths: ['reasoning', 'coding', 'math'],
    supportsTools: true,
    privacyLevel: 'cloud',
  },
];

export function syncDealsForgeData(
  registry: InventoryRegistry,
): { modelsAdded: number; providersAdded: number } {
  let modelsAdded = 0;
  let providersAdded = 0;

  for (const entry of DEALSFORGE_MODELS) {
    const model: Model = {
      ...entry,
      id: entry.id!,
      displayName: entry.displayName!,
      modality: entry.modality ?? ['text'],
      latencyClass: entry.latencyClass ?? 'unknown',
      qualityClass: entry.qualityClass ?? 'unknown',
      strengths: entry.strengths ?? [],
      weaknesses: [],
      privacyLevel: entry.privacyLevel ?? 'cloud',
      availability: 'available',
      sourceConfidence: 'high',
      lastCheckedAt: new Date().toISOString(),
    };

    const existing = registry.getModel(entry.providerId, entry.id!);
    if (!existing) {
      registry.addModel(model);
      modelsAdded++;
    }
  }

  // Add a DealsForge provider
  const existing = registry.getProvider('dealsforge');
  if (!existing) {
    registry.addProvider({
      id: 'dealsforge',
      name: 'DealsForge Intelligence',
      source: 'dealsforge',
      privacyLevel: 'cloud',
      status: 'available',
      lastCheckedAt: new Date().toISOString(),
    });
    providersAdded++;
  }

  return { modelsAdded, providersAdded };
}
