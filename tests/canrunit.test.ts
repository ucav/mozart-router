import { describe, it, expect } from 'vitest';
import { scanLocalCapability, estimateLocalModelCapacity } from '../src/utils/canrunit';

describe('scanLocalCapability', () => {
  it('returns valid system info', () => {
    const cap = scanLocalCapability();
    expect(typeof cap.os).toBe('string');
    expect(typeof cap.arch).toBe('string');
    expect(typeof cap.platform).toBe('string');
    expect(typeof cap.cpu.model).toBe('string');
    expect(cap.cpu.cores).toBeGreaterThan(0);
    expect(cap.ram.totalGB).toBeGreaterThan(0);
    expect(cap.ram.freeGB).toBeGreaterThanOrEqual(0);
  });

  it('ollamaAvailable is a boolean', () => {
    const cap = scanLocalCapability();
    expect(typeof cap.ollamaAvailable).toBe('boolean');
  });

  it('localModelCount is a non-negative integer', () => {
    const cap = scanLocalCapability();
    expect(cap.localModelCount).toBeGreaterThanOrEqual(0);
  });

  it('gpu field is undefined or has model string', () => {
    const cap = scanLocalCapability();
    if (cap.gpu !== undefined) {
      expect(typeof cap.gpu.model).toBe('string');
      expect(cap.gpu.model.length).toBeGreaterThan(0);
      if (cap.gpu.vramGB !== undefined) {
        expect(cap.gpu.vramGB).toBeGreaterThan(0);
      }
    }
  });
});

describe('estimateLocalModelCapacity', () => {
  it('returns capacity estimates for standard model sizes', () => {
    const cap = scanLocalCapability();
    const estimates = estimateLocalModelCapacity(cap);
    expect(estimates.length).toBe(4);
    for (const e of estimates) {
      expect(typeof e.modelSize).toBe('string');
      expect(typeof e.vramRequired).toBe('number');
      expect(typeof e.canRun).toBe('boolean');
    }
  });

  it('can run 7B on machines with enough RAM (no GPU)', () => {
    const estimates = estimateLocalModelCapacity({
      os: 'Linux', arch: 'x64', platform: 'linux',
      cpu: { model: 'test', cores: 8 },
      ram: { totalGB: 16, freeGB: 8 },
      gpu: undefined,
      ollamaAvailable: false,
      localModelCount: 0,
    });
    const entry7b = estimates.find((e) => e.modelSize === '7B (Q4)');
    expect(entry7b?.canRun).toBe(true);
  });

  it('cannot run 70B without sufficient VRAM', () => {
    const estimates = estimateLocalModelCapacity({
      os: 'Linux', arch: 'x64', platform: 'linux',
      cpu: { model: 'test', cores: 8 },
      ram: { totalGB: 16, freeGB: 8 },
      gpu: { model: 'RTX 3080', vramGB: 10 },
      ollamaAvailable: false,
      localModelCount: 0,
    });
    const entry70b = estimates.find((e) => e.modelSize === '70B (Q4)');
    expect(entry70b?.canRun).toBe(false);
  });
});
