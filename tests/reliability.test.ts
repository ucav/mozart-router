import { describe, it, expect } from 'vitest';
import { ReliabilityTracker } from '../src/core/reliability';

describe('ReliabilityTracker', () => {
  it('starts empty', () => {
    const tracker = new ReliabilityTracker();
    expect(tracker.getAll().length).toBe(0);
  });

  it('tracks successful checks', () => {
    const tracker = new ReliabilityTracker();
    tracker.record({ adapterId: 'test', adapterName: 'Test', status: { connected: true, latencyMs: 100 }, lastCheck: new Date().toISOString(), consecutiveFailures: 0, circuitState: 'closed' });
    tracker.record({ adapterId: 'test', adapterName: 'Test', status: { connected: true, latencyMs: 200 }, lastCheck: new Date().toISOString(), consecutiveFailures: 0, circuitState: 'closed' });

    const r = tracker.get('test')!;
    expect(r.successes).toBe(2);
    expect(r.failures).toBe(0);
    expect(r.uptimePercent).toBe(100);
    expect(r.trustScore).toBeGreaterThan(0.7);
  });

  it('tracks failures and lowers trust', () => {
    const tracker = new ReliabilityTracker();
    tracker.record({ adapterId: 'test', adapterName: 'Test', status: { connected: true }, lastCheck: new Date().toISOString(), consecutiveFailures: 0, circuitState: 'closed' });
    tracker.record({ adapterId: 'test', adapterName: 'Test', status: { connected: false, error: 'timeout' }, lastCheck: new Date().toISOString(), consecutiveFailures: 1, circuitState: 'closed' });
    tracker.record({ adapterId: 'test', adapterName: 'Test', status: { connected: false, error: 'timeout' }, lastCheck: new Date().toISOString(), consecutiveFailures: 2, circuitState: 'open' });

    const r = tracker.get('test')!;
    expect(r.successes).toBe(1);
    expect(r.failures).toBe(2);
    expect(r.uptimePercent).toBe(33);
    expect(r.streak).toBeLessThan(0);
  });

  it('returns providers sorted by trust', () => {
    const tracker = new ReliabilityTracker();
    tracker.record({ adapterId: 'reliable', adapterName: 'R', status: { connected: true }, lastCheck: new Date().toISOString(), consecutiveFailures: 0, circuitState: 'closed' });
    tracker.record({ adapterId: 'reliable', adapterName: 'R', status: { connected: true }, lastCheck: new Date().toISOString(), consecutiveFailures: 0, circuitState: 'closed' });
    tracker.record({ adapterId: 'flaky', adapterName: 'F', status: { connected: false }, lastCheck: new Date().toISOString(), consecutiveFailures: 1, circuitState: 'open' });

    const all = tracker.getAll();
    expect(all[0].providerId).toBe('reliable');
    expect(all[0].trustScore).toBeGreaterThan(all[1].trustScore);
  });

  it('resets cleanly', () => {
    const tracker = new ReliabilityTracker();
    tracker.record({ adapterId: 'test', adapterName: 'T', status: { connected: true }, lastCheck: new Date().toISOString(), consecutiveFailures: 0, circuitState: 'closed' });
    tracker.reset();
    expect(tracker.getAll().length).toBe(0);
  });
});
