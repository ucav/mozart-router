import { RouteDecision, CostEstimate, TokenUsage } from '../types';

export interface CacheEntry {
  key: string;
  route: RouteDecision;
  cost: CostEstimate;
  tokens: TokenUsage;
  output?: string;
  hits: number;
  createdAt: string;
  lastHitAt: string;
  ttlMs: number;
}

export class ResultCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(options?: { maxSize?: number; defaultTtlMs?: number }) {
    this.maxSize = options?.maxSize ?? 500;
    this.defaultTtlMs = options?.defaultTtlMs ?? 3600000; // 1 hour
  }

  private buildKey(input: string, taskType?: string): string {
    const normalized = input.trim().toLowerCase().slice(0, 200);
    return `${taskType ?? 'any'}:${normalized}`;
  }

  get(input: string, taskType?: string): CacheEntry | undefined {
    const key = this.buildKey(input, taskType);
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - new Date(entry.createdAt).getTime() > entry.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    entry.hits++;
    entry.lastHitAt = new Date().toISOString();
    return entry;
  }

  set(
    input: string,
    taskType: string | undefined,
    route: RouteDecision,
    cost: CostEstimate,
    tokens: TokenUsage,
    output?: string,
    ttlMs?: number,
  ): void {
    const key = this.buildKey(input, taskType);
    const entry: CacheEntry = {
      key,
      route,
      cost,
      tokens,
      output,
      hits: 1,
      createdAt: new Date().toISOString(),
      lastHitAt: new Date().toISOString(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
    };

    this.cache.set(key, entry);

    // Evict oldest if over max size
    if (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      const time = new Date(entry.lastHitAt).getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }

  has(input: string, taskType?: string): boolean {
    return this.get(input, taskType) !== undefined;
  }

  size(): number {
    return this.cache.size;
  }

  stats(): { size: number; maxSize: number; totalHits: number; entries: Array<{ key: string; hits: number }> } {
    let totalHits = 0;
    const entries: Array<{ key: string; hits: number }> = [];
    for (const [key, entry] of this.cache) {
      totalHits += entry.hits;
      entries.push({ key: key.slice(0, 60), hits: entry.hits });
    }
    entries.sort((a, b) => b.hits - a.hits);
    return { size: this.cache.size, maxSize: this.maxSize, totalHits, entries };
  }

  clear(): void {
    this.cache.clear();
  }

  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - new Date(entry.createdAt).getTime() > entry.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}
