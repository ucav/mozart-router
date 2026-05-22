import {
  GatewayAdapter,
  DetectionResult,
  GatewayConfigSummary,
  Provider,
  Model,
} from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface OpenClawConfig {
  models?: {
    providers?: Record<string, {
      api?: string;
      apiKey?: string;
      baseUrl?: string;
      models?: Array<{
        id: string;
        name?: string;
        contextWindow?: number;
        cost?: { input: number; output: number; cacheRead?: number; cacheWrite?: number };
        input?: string[];
        reasoning?: boolean;
      }>;
    }>;
  };
  gateway?: { mode?: string; port?: number; bind?: string };
  agents?: { defaults?: { model?: { primary?: string } } };
}

function findConfig(): string | null {
  const paths = [
    path.join(os.homedir(), '.openclaw', 'openclaw.json'),
    path.join(os.homedir(), '.config', 'openclaw', 'openclaw.json'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export class OpenClawAdapter implements GatewayAdapter {
  id = 'openclaw';
  name = 'OpenClaw';

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    const configPath = findConfig();

    if (configPath) {
      details.push(`Config found: ${configPath}`);
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config: OpenClawConfig = JSON.parse(raw);
        const providers = config.models?.providers ?? {};
        const providerCount = Object.keys(providers).length;
        const modelCount = Object.values(providers).reduce((sum, p) => sum + (p.models?.length ?? 0), 0);

        details.push(`${providerCount} provider(s), ${modelCount} model(s)`);
        for (const [name, p] of Object.entries(providers)) {
          details.push(`  Provider: ${name} (api=${p.api}, ${p.models?.length ?? 0} models)`);
          for (const m of p.models ?? []) {
            details.push(`    - ${m.id} (ctx: ${m.contextWindow ?? '?'}, cost: ${m.cost?.input ?? 0}/${m.cost?.output ?? 0})`);
          }
        }

        const gateway = config.gateway;
        if (gateway) {
          details.push(`Gateway: ${gateway.mode} mode, port ${gateway.port ?? 'default'}`);
        }

        return {
          detected: true,
          gatewayId: this.id,
          gatewayName: this.name,
          configPath,
          configFormat: 'json',
          status: 'active',
          providersCount: providerCount,
          modelsCount: modelCount,
          details,
        };
      } catch (err) {
        details.push(`Config parse error: ${err}`);
      }
    } else {
      details.push('No OpenClaw config found (~/.openclaw/openclaw.json)');
    }

    return {
      detected: false,
      gatewayId: this.id,
      gatewayName: this.name,
      status: 'not_found',
      providersCount: 0,
      modelsCount: 0,
      details,
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    const configPath = findConfig();
    const summary: GatewayConfigSummary = {
      gatewayId: this.id,
      gatewayName: this.name,
      providers: [],
      models: [],
      capabilities: ['agent', 'tools', 'multi-agent', 'skill_system'],
    };

    if (!configPath) return summary;
    try {
      const config: OpenClawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const providers = config.models?.providers ?? {};
      for (const [name, p] of Object.entries(providers)) {
        summary.providers.push(name);
        for (const m of p.models ?? []) {
          summary.models.push(`${name}/${m.id}`);
        }
      }
    } catch { /* ignore */ }
    return summary;
  }

  async listProviders(): Promise<Provider[]> {
    const configPath = findConfig();
    if (!configPath) return [];

    try {
      const config: OpenClawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const providers = config.models?.providers ?? {};

      return Object.entries(providers).map(([name, p]) => {
        const isLocal = (p.baseUrl ?? '').includes('localhost') || (p.baseUrl ?? '').includes('127.0.0.1');
        return {
          id: `openclaw-${name}`,
          name,
          source: 'detected' as const,
          gateway: this.id,
          baseUrl: p.baseUrl,
          apiKeyRef: p.apiKey ? `managed_by_openclaw` : undefined,
          supportsStreaming: true,
          supportsTools: 'unknown' as const,
          privacyLevel: isLocal ? 'local' as const : 'cloud' as const,
          status: 'available' as const,
          lastCheckedAt: new Date().toISOString(),
        };
      });
    } catch {
      return [];
    }
  }

  async listModels(): Promise<Model[]> {
    const configPath = findConfig();
    if (!configPath) return [];

    try {
      const config: OpenClawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const providers = config.models?.providers ?? {};
      const models: Model[] = [];

      for (const [providerName, p] of Object.entries(providers)) {
        const isLocal = (p.baseUrl ?? '').includes('localhost') || (p.baseUrl ?? '').includes('127.0.0.1');
        for (const m of p.models ?? []) {
          models.push({
            id: m.id,
            providerId: `openclaw-${providerName}`,
            gatewayId: this.id,
            displayName: m.name ?? m.id,
            modality: (m.input as Model['modality']) ?? ['text'],
            contextWindow: m.contextWindow ?? (isLocal ? 8192 : 32768),
            inputPrice: m.cost?.input ?? 0,
            outputPrice: m.cost?.output ?? 0,
            latencyClass: isLocal ? 'fast' : 'medium',
            qualityClass: (m.contextWindow ?? 0) > 32000 ? 'high' : 'medium',
            strengths: isLocal ? ['local', 'private', 'free'] : ['openclaw_managed'],
            weaknesses: [],
            supportsTools: m.reasoning ? true : 'unknown',
            privacyLevel: isLocal ? 'local' : 'cloud',
            availability: 'available',
            sourceConfidence: 'high',
            lastCheckedAt: new Date().toISOString(),
          });
        }
      }
      return models;
    } catch {
      return [];
    }
  }
}
