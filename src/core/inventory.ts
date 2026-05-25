import {
  Provider,
  Model,
  GatewayAdapter,
  DetectionResult,
  InventorySnapshot,
} from '../types';

export class InventoryRegistry {
  private providers: Map<string, Provider> = new Map();
  private models: Map<string, Model> = new Map();
  private adapters: Map<string, GatewayAdapter> = new Map();
  private detections: Map<string, DetectionResult> = new Map();

  // ── Providers ──────────────────────────────────────────
  addProvider(provider: Provider): void {
    const existing = this.providers.get(provider.id);
    if (existing) {
      this.providers.set(provider.id, { ...existing, ...provider });
    } else {
      this.providers.set(provider.id, provider);
    }
  }

  getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  listProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  // ── Models ─────────────────────────────────────────────
  addModel(model: Model): void {
    const key = `${model.providerId}:${model.id}`;
    const existing = this.models.get(key);
    if (existing) {
      this.models.set(key, { ...existing, ...model });
    } else {
      this.models.set(key, model);
    }
  }

  getModel(providerId: string, modelId: string): Model | undefined {
    return this.models.get(`${providerId}:${modelId}`);
  }

  listModels(filter?: { providerId?: string; gatewayId?: string; privacyLevel?: string }): Model[] {
    let result = Array.from(this.models.values());
    if (filter?.providerId) {
      result = result.filter((m) => m.providerId === filter.providerId);
    }
    if (filter?.gatewayId) {
      result = result.filter((m) => m.gatewayId === filter.gatewayId);
    }
    if (filter?.privacyLevel) {
      result = result.filter((m) => m.privacyLevel === filter.privacyLevel);
    }
    return result;
  }

  // ── Adapters ───────────────────────────────────────────
  registerAdapter(adapter: GatewayAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id?: string): GatewayAdapter | undefined {
    if (!id) return undefined;
    return this.adapters.get(id);
  }

  hasAdapter(id?: string): boolean {
    if (!id) return false;
    return this.adapters.has(id);
  }

  listAdapters(): GatewayAdapter[] {
    return Array.from(this.adapters.values());
  }

  // ── Detection ──────────────────────────────────────────
  recordDetection(detection: DetectionResult): void {
    this.detections.set(detection.gatewayId, detection);
  }

  getDetection(gatewayId: string): DetectionResult | undefined {
    return this.detections.get(gatewayId);
  }

  listDetections(): DetectionResult[] {
    return Array.from(this.detections.values());
  }

  // ── Merge ──────────────────────────────────────────────
  mergeFromAdapter(adapterId: string, providers: Provider[], models: Model[]): void {
    for (const p of providers) {
      const existing = this.providers.get(p.id);
      if (existing) {
        this.providers.set(p.id, {
          ...existing,
          ...p,
          gateway: existing.gateway ? `${existing.gateway},${adapterId}` : (p.gateway || adapterId),
          source: p.source || existing.source,
        });
      } else {
        this.providers.set(p.id, { ...p, gateway: p.gateway || adapterId, source: p.source || 'detected' });
      }
    }
    for (const m of models) {
      this.addModel({ ...m, gatewayId: adapterId });
    }
  }

  // ── Snapshots ──────────────────────────────────────────
  snapshot(): InventorySnapshot {
    const sources = new Set(this.listProviders().map((p) => p.source));
    const sourceStr = sources.has('manual') ? 'hybrid' : sources.has('dealsforge') ? 'hybrid' : 'auto';
    return {
      gateways: this.listDetections(),
      providers: this.listProviders(),
      models: this.listModels(),
      generatedAt: new Date().toISOString(),
      source: sourceStr as 'auto' | 'manual' | 'hybrid',
    };
  }

  clear(): void {
    this.providers.clear();
    this.models.clear();
    this.adapters.clear();
    this.detections.clear();
  }
}
