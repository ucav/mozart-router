import { describe, it, expect } from 'vitest';
import { PrivacyGuard } from '../src/privacy/guard';

describe('PrivacyGuard', () => {
  const guard = new PrivacyGuard();

  it('detects API keys', () => {
    const result = guard.evaluate('api_key: "sk-1234567890abcdef1234567890abcdef"');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.type === 'api_key')).toBe(true);
  });

  it('detects tokens', () => {
    const result = guard.evaluate('token: "ghp_abcdefghijklmnopqrstuvwxyz1234567890"');
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('detects private keys', () => {
    const result = guard.evaluate('-----BEGIN RSA PRIVATE KEY-----');
    expect(result.findings.some((f) => f.type === 'private_key')).toBe(true);
  });

  it('does not flag normal content', () => {
    const result = guard.evaluate('Hello, this is a normal message about code.');
    expect(result.findings.length).toBe(0);
    expect(result.action).toBe('allow');
  });

  it('blocks cloud when critical secrets found', () => {
    const result = guard.evaluate(
      'api_key: "sk-1234567890abcdef1234567890abcdef"\nAlso contains token: "ghp_abcdef0123456789abcdef0123456789"'
    );
    expect(result.action).toBe('local_only');
  });

  it('redacts content when appropriate', () => {
    const result = guard.evaluate('api_key: "sk-1234567890abcdef1234567890abcdef"', 'privacy_first');
    expect(result.redactedContent).toBeDefined();
    expect(result.redactedContent).toContain('***');
  });

  it('respects open mode', () => {
    const content = 'regular text content without secrets';
    const result = guard.evaluate(content, 'open');
    expect(result.allowed).toBe(true);
  });

  it('returns local_only in local_only mode', () => {
    const result = guard.evaluate('regular content', 'local_only');
    expect(result.action).toBe('allow');
    expect(result.mode).toBe('local_only');
  });
});
