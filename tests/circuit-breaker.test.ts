import { describe, it, expect } from 'vitest';
import { CircuitBreaker, CircuitBreakerError } from '../src/routing/circuit-breaker';

describe('CircuitBreaker', () => {
  it('starts in closed state', () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe('closed');
  });

  it('opens after reaching failure threshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, recoveryTimeoutMs: 60000 });
    await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    expect(cb.getState()).toBe('closed');
    await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    expect(cb.getState()).toBe('open');
  });

  it('throws CircuitBreakerError when open', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, recoveryTimeoutMs: 60000 });
    await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    await expect(cb.call(async () => 'ok')).rejects.toThrow(CircuitBreakerError);
  });

  it('resets on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    expect(cb.getState()).toBe('closed'); // Only 1 failure
    const result = await cb.call(async () => 'success');
    expect(result).toBe('success');
    expect(cb.getState()).toBe('closed');
  });

  it('transitions to half_open after recovery timeout', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, recoveryTimeoutMs: 1 });
    await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    expect(cb.getState()).toBe('open');
    await new Promise((r) => setTimeout(r, 10));
    expect(cb.getState()).toBe('half_open');
  });
});
