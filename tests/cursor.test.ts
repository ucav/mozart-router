import { describe, it, expect } from 'vitest';
import { CursorAdapter } from '../src/adapters/cursor';

describe('CursorAdapter', () => {
  const adapter = new CursorAdapter();

  it('has correct id and name', () => {
    expect(adapter.id).toBe('cursor');
    expect(adapter.name).toBe('Cursor');
  });

  it('returns a detection result (detected or not_found)', async () => {
    const result = await adapter.detect();
    expect(result.gatewayId).toBe('cursor');
    expect(['active', 'configured_only', 'not_found']).toContain(result.status);
    expect(Array.isArray(result.details)).toBe(true);
    expect(result.details.length).toBeGreaterThan(0);
  });

  it('lists models only when detected', async () => {
    const detection = await adapter.detect();
    const models = await adapter.listModels();
    if (detection.detected) {
      expect(models.length).toBeGreaterThan(0);
      for (const m of models) {
        expect(m.gatewayId).toBe('cursor');
        expect(m.privacyLevel).toBe('cloud');
      }
    } else {
      expect(models).toHaveLength(0);
    }
  });

  it('lists providers only when detected', async () => {
    const detection = await adapter.detect();
    const providers = await adapter.listProviders();
    if (detection.detected) {
      expect(providers.length).toBeGreaterThan(0);
    } else {
      expect(providers).toHaveLength(0);
    }
  });

  it('returns a valid config summary', async () => {
    const config = await adapter.readConfig();
    expect(config.gatewayId).toBe('cursor');
    expect(config.capabilities).toContain('mcp');
  });
});
