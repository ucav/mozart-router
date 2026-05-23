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

function findHermesConfig(): string | null {
  const paths = [
    path.join(os.homedir(), '.hermes', 'config.json'),
    path.join(os.homedir(), '.config', 'hermes', 'config.json'),
    path.join(os.homedir(), '.hermes', 'config.yaml'),
    path.join(os.homedir(), '.config', 'hermes', 'config.yml'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export class HermesAdapter implements GatewayAdapter {
  id = 'hermes';
  name = 'Hermes Agent';

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    const configPath = findHermesConfig();

    if (configPath) {
      details.push(`Hermes config found at: ${configPath}`);
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        // Try parsing as JSON
        try {
          const config = JSON.parse(content);
          const providers = config.providers ?? config.models ?? {};
          const providerCount = Object.keys(providers).length;
          details.push(`${providerCount} provider(s) configured`);
          return {
            detected: true, gatewayId: this.id, gatewayName: this.name,
            configPath, configFormat: 'json',
            status: 'active', providersCount: providerCount, modelsCount: 0,
            details,
          };
        } catch {
          // Try YAML
          details.push('Config found (format auto-detected)');
        }
      } catch {
        details.push('Could not read config file');
      }
    } else {
      details.push('No Hermes config found');
      details.push('Expected locations: ~/.hermes/config.json, ~/.config/hermes/config.json');
    }

    const hasEnv = !!process.env.HERMES_API_KEY || !!process.env.HERMES_CONFIG;
    if (hasEnv) details.push('Hermes environment variables detected');

    const active = !!configPath || hasEnv;

    return {
      detected: active,
      gatewayId: this.id, gatewayName: this.name,
      configPath: configPath ?? undefined,
      status: active ? (configPath ? 'active' : 'configured_only') : 'not_found',
      providersCount: 0,
      modelsCount: 0,
      details,
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    return {
      gatewayId: this.id, gatewayName: this.name,
      providers: [], models: [],
      capabilities: ['agent', 'tools', 'workflows', 'agentic'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    const configPath = findHermesConfig();
    if (!configPath) return [];

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const providers = config.providers ?? config.models ?? {};
      return Object.keys(providers).map((name) => ({
        id: `hermes-${name}`,
        name,
        source: 'detected' as const,
        gateway: this.id,
        privacyLevel: 'cloud' as const,
        status: 'available' as const,
        lastCheckedAt: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async listModels(): Promise<Model[]> {
    const configPath = findHermesConfig();
    if (!configPath) return [];

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const providers = config.providers ?? config.models ?? {};
      const models: Model[] = [];
      for (const [providerName, providerConfig] of Object.entries(providers)) {
        const modelList = (providerConfig as Record<string, unknown>).models as string[] | undefined;
        if (modelList) {
          for (const modelId of modelList) {
            models.push({
              id: modelId,
              providerId: `hermes-${providerName}`,
              gatewayId: this.id,
              displayName: modelId,
              modality: ['text'],
              contextWindow: 32768,
              latencyClass: 'medium' as const,
              qualityClass: 'medium' as const,
              strengths: ['hermes_managed'],
              weaknesses: ['capabilities_unknown'],
              privacyLevel: 'cloud' as const,
              availability: 'available' as const,
              sourceConfidence: 'medium' as const,
              lastCheckedAt: new Date().toISOString(),
            });
          }
        }
      }
      return models;
    } catch {
      return [];
    }
  }
}
