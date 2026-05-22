import { PrivacyDecision, PrivacyFinding, PrivacyAction, PrivacyMode } from '../types';
import { Logger } from '../logs/logger';

const SECRET_PATTERNS: Array<{ type: PrivacyFinding['type']; pattern: RegExp; severity: PrivacyFinding['severity']; defaultAction: PrivacyAction }> = [
  {
    type: 'api_key',
    pattern: /(?:api[_-]?key|apikey|api_secret|secret_key)\s*[:=]\s*['"`][A-Za-z0-9_\-]{20,}['"`]/gi,
    severity: 'critical',
    defaultAction: 'local_only',
  },
  {
    type: 'token',
    pattern: /(?:token|access_token|auth_token|bearer)\s*[:=]\s*['"`][A-Za-z0-9_\-\.]{20,}['"`]/gi,
    severity: 'critical',
    defaultAction: 'local_only',
  },
  {
    type: 'secret',
    pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi,
    severity: 'critical',
    defaultAction: 'block_cloud',
  },
  {
    type: 'env_file',
    pattern: /(?:^|\n)([A-Z_]{3,50})\s*=\s*['"`]?[A-Za-z0-9_\-\.\/@:]{10,}['"`]?/gm,
    severity: 'high',
    defaultAction: 'block_cloud',
  },
  {
    type: 'private_key',
    pattern: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PGP)\s+PRIVATE\s+KEY-----/gi,
    severity: 'critical',
    defaultAction: 'local_only',
  },
  {
    type: 'credential',
    pattern: /(?:credential|cred)s?\s*[:=]\s*['"`][A-Za-z0-9_\-]{10,}['"`]/gi,
    severity: 'high',
    defaultAction: 'block_cloud',
  },
];

export class PrivacyGuard {
  constructor(private logger?: Logger) {}

  evaluate(content: string, mode: PrivacyMode = 'balanced'): PrivacyDecision {
    const findings: PrivacyFinding[] = [];
    let highestAction: PrivacyAction = 'allow';

    const actionPriority: Record<PrivacyAction, number> = {
      allow: 0,
      redact: 1,
      block_cloud: 2,
      local_only: 3,
      require_confirmation: 4,
    };

    for (const { type, pattern, severity, defaultAction } of SECRET_PATTERNS) {
      // Reset lastIndex for global regex
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const matched = match[0];
        const masked = matched.length > 20
          ? matched.substring(0, 8) + '***' + matched.substring(matched.length - 4)
          : '***REDACTED***';

        const finding: PrivacyFinding = {
          type,
          match: matched,
          masked,
          position: { start: match.index, end: match.index + matched.length },
          severity,
          action: defaultAction,
          reason: `Detected ${type}: ${masked}`,
        };

        // Adjust action based on mode
        if (mode === 'local_only') {
          finding.action = 'local_only';
        } else if (mode === 'privacy_first' && severity === 'critical') {
          finding.action = 'local_only';
        } else if (mode === 'open' && severity === 'low') {
          finding.action = 'allow';
        }

        findings.push(finding);

        if (this.logger) {
          this.logger.logPrivacyEvent(type, finding.action, masked);
        }
      }
    }

    // Determine overall action
    for (const f of findings) {
      if (actionPriority[f.action] > actionPriority[highestAction]) {
        highestAction = f.action;
      }
    }

    const explanation: string[] = [];
    if (findings.length === 0) {
      explanation.push('No secrets or sensitive data detected.');
    } else {
      explanation.push(`${findings.length} sensitive items detected.`);
      for (const f of findings) {
        explanation.push(`  - ${f.type} (${f.severity}): action=${f.action}`);
      }
    }

    let redactedContent: string | undefined;
    if (highestAction !== 'allow') {
      redactedContent = content;
      for (const f of findings) {
        redactedContent = redactedContent.replace(f.match, f.masked);
      }
    }

    return {
      allowed: highestAction === 'allow',
      mode,
      findings,
      action: highestAction,
      redactedContent,
      explanation,
    };
  }
}
