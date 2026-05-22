import { describe, it, expect } from 'vitest';
import { Redactor } from '../src/logs/redactor';

describe('Redactor', () => {
  const redactor = new Redactor();

  it('redacts API keys', () => {
    const input = 'My key is sk-1234567890abcdef1234567890abcdef1234';
    const result = redactor.redact(input);
    expect(result).not.toContain('sk-1234');
    expect(result).toContain('***REDACTED***');
  });

  it('redacts GitHub tokens', () => {
    const input = 'token: ghp_abcdefghijklmnopqrstuvwxyz1234567890';
    const result = redactor.redact(input);
    expect(result).not.toContain('ghp_abc');
    expect(result).toContain('***REDACTED***');
  });

  it('redacts Google API keys', () => {
    const input = 'key: AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r';
    const result = redactor.redact(input);
    expect(result).not.toContain('AIza');
    expect(result).toContain('***REDACTED***');
  });

  it('redacts API_KEY env vars', () => {
    const input = 'API_KEY=my-super-secret-key-12345';
    const result = redactor.redact(input);
    expect(result).toContain('***REDACTED***');
    expect(result).not.toContain('my-super-secret');
  });

  it('redacts SECRET env vars', () => {
    const input = 'JWT_SECRET=very-secret-jwt-value-here';
    const result = redactor.redact(input);
    expect(result).toContain('***REDACTED***');
  });

  it('passes through normal content', () => {
    const input = 'Hello, this is a normal message about code and programming.';
    const result = redactor.redact(input);
    expect(result).toBe(input);
  });

  it('correctly identifies redacted content', () => {
    expect(redactor.isRedacted('Hello ***REDACTED*** world')).toBe(true);
    expect(redactor.isRedacted('Hello world')).toBe(false);
  });

  it('redacts DATABASE_URL patterns', () => {
    const input = 'DATABASE_URL=postgresql://user:secret@localhost:5432/db';
    const result = redactor.redact(input);
    expect(result).toContain('***REDACTED***');
  });
});
