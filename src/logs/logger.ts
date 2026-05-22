import { PrivacyAction } from '../types';
import { Redactor } from './redactor';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  message: string;
  redacted: boolean;
}

export class Logger {
  private logs: LogEntry[] = [];
  private enabled: boolean;
  private redact: boolean;
  private redactor: Redactor;
  private lastLogId: string;

  constructor(config?: { enabled?: boolean; redactSecrets?: boolean; retentionDays?: number }) {
    this.enabled = config?.enabled ?? true;
    this.redact = config?.redactSecrets ?? true;
    this.lastLogId = '';
    this.redactor = new Redactor();
  }

  log(level: LogEntry['level'], event: string, message: string): void {
    if (!this.enabled) return;

    const safeMessage = this.redact ? this.redactor.redact(message) : message;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message: safeMessage,
      redacted: this.redact,
    };

    this.logs.push(entry);
    this.lastLogId = `${entry.timestamp}-${event}`;
  }

  info(event: string, message: string): void {
    this.log('info', event, message);
  }

  warn(event: string, message: string): void {
    this.log('warn', event, message);
  }

  error(event: string, message: string): void {
    this.log('error', event, message);
  }

  debug(event: string, message: string): void {
    this.log('debug', event, message);
  }

  logRoutingDecision(taskType: string, summary: string): void {
    this.info('routing', `Task: ${taskType} — ${summary}`);
  }

  logPrivacyEvent(type: string, action: PrivacyAction, detail: string): void {
    const level = action === 'local_only' || action === 'block_cloud' ? 'warn' : 'info';
    this.log(level, 'privacy', `[${type}] ${action}: ${detail}`);
  }

  logEvent(event: string, message: string): void {
    this.info(event, message);
  }

  getLastLogRef(): string {
    return this.lastLogId;
  }

  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter((l) => l.level === level);
  }

  getLogsByEvent(event: string): LogEntry[] {
    return this.logs.filter((l) => l.event === event);
  }

  flush(): void {
    this.logs = [];
  }

  toggle(enabled: boolean): void {
    this.enabled = enabled;
  }
}
