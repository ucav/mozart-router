const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9]{32,}/g,
  /[A-Za-z0-9+/]{32,}={0,2}/g,
  /ghp_[A-Za-z0-9]{36}/g,
  /gho_[A-Za-z0-9]{36}/g,
  /ghu_[A-Za-z0-9]{36}/g,
  /ghs_[A-Za-z0-9]{36}/g,
  /xox[bprsa]-[A-Za-z0-9-]+/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /hf_[A-Za-z0-9]{34}/g,
];

const COMMON_NAMES = new Set([
  'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PASSWD', 'CREDENTIAL',
  'PRIVATE_KEY', 'ACCESS_KEY', 'SECRET_KEY', 'CLIENT_SECRET',
  'DATABASE_URL', 'MONGO_URI', 'POSTGRES_URL', 'REDIS_URL',
]);

export class Redactor {
  redact(text: string): string {
    let result = text;

    for (const pattern of SECRET_PATTERNS) {
      result = result.replace(pattern, '***REDACTED***');
    }

    // Redact known env var patterns
    const lines = result.split('\n');
    result = lines
      .map((line) => {
        for (const name of COMMON_NAMES) {
          const regex = new RegExp(`(${name})\\s*=\\s*(.+)`, 'i');
          const match = line.match(regex);
          if (match) {
            const value = match[2].replace(/['"]/g, '');
            if (value.length > 5) {
              return line.replace(match[2], '***REDACTED***');
            }
          }
        }
        return line;
      })
      .join('\n');

    return result;
  }

  isRedacted(text: string): boolean {
    return text.includes('***REDACTED***');
  }

  sanitize(text: string): string {
    return this.redact(text);
  }
}
