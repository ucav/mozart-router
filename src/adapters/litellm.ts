import {
  GatewayAdapter,
  DetectionResult,
  GatewayConfigSummary,
  Provider,
  Model,
  ExecutionTarget,
  ExecutionRequest,
  ExecutionResult,
  RouteDecision,
} from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class LiteLLMAdapter implements GatewayAdapter {
  id = 'litellm';
  name = 'LiteLLM';

  private configPaths(): string[] {
    const home = os.homedir();
    return [
      path.join(process.cwd(), 'litellm_config.yaml'),
      path.join(process.cwd(), 'litellm_config.yml'),
      path.join(home, '.litellm', 'config.yaml'),
      path.join(home, '.litellm', 'config.yml'),
      path.join(process.cwd(), 'config.yaml'),
      path.join(process.cwd(), 'config.yml'),
    ];
  }

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    let foundConfig = false;
    let configPath: string | undefined;

    for (const p of this.configPaths()) {
      if (fs.existsSync(p)) {
        foundConfig = true;
        configPath = p;
        details.push(`LiteLLM config found at: ${p}`);
        break;
      }
    }

    if (!foundConfig) {
      details.push('No LiteLLM config file found in common locations');
    }

    const active = foundConfig;
    // Try to parse providers from config
    let providersCount = 0;
    let modelsCount = 0;

    if (foundConfig && configPath) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        // Simple YAML parsing for known LiteLLM structures
        const providerMatches = content.match(/model_name:|litellm_params:|model:/g);
        if (providerMatches) {
          providersCount = 1;
          modelsCount = providerMatches.length;
          details.push(`Approximately ${modelsCount} model entries detected`);
        }
      } catch {
        details.push('Could not parse config file');
      }
    }

    return {
      detected: foundConfig,
      gatewayId: this.id,
      gatewayName: this.name,
      configPath,
      configFormat: 'yaml',
      status: active ? 'active' : 'not_found',
      providersCount,
      modelsCount,
      details,
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    const providers: string[] = [];
    const models: string[] = [];

    for (const p of this.configPaths()) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf-8');
          const lines = content.split('\n');
          for (const line of lines) {
            const modelMatch = line.match(/model_name:\s*["']?([^"'\s#]+)/);
            if (modelMatch) {
              models.push(modelMatch[1]);
            }
          }
        } catch {
          // continue
        }
      }
    }

    return {
      gatewayId: this.id,
      gatewayName: this.name,
      providers,
      models,
      capabilities: ['multi-provider', 'proxy', 'openai-compatible'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    const summary = await this.readConfig();

    if (summary.models.length > 0) {
      const uniqueProviders = new Set<string>();
      for (const m of summary.models) {
        const parts = m.split('/');
        if (parts.length >= 1) uniqueProviders.add(parts[0]);
      }

      return Array.from(uniqueProviders).map((name) => ({
        id: `litellm-${name}`,
        name,
        source: 'detected' as const,
        gateway: this.id,
        supportsModelsEndpoint: true,
        supportsStreaming: true,
        supportsTools: 'unknown' as const,
        privacyLevel: 'cloud' as const,
        status: 'available' as const,
        lastCheckedAt: new Date().toISOString(),
      }));
    }

    return [
      {
        id: 'litellm-default',
        name: 'LiteLLM Gateway',
        source: 'detected',
        gateway: this.id,
        supportsModelsEndpoint: true,
        privacyLevel: 'cloud',
        status: 'available',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async listModels(): Promise<Model[]> {
    const summary = await this.readConfig();
    return summary.models.map((name) => ({
      id: name,
      providerId: `litellm-${name.split('/')[0] || 'unknown'}`,
      gatewayId: this.id,
      displayName: name,
      modality: ['text'],
      contextWindow: 8192,
      latencyClass: 'medium' as const,
      qualityClass: 'medium' as const,
      strengths: ['proxy', 'multi-provider'],
      weaknesses: [],
      privacyLevel: 'cloud' as const,
      availability: 'available' as const,
      sourceConfidence: 'medium' as const,
      lastCheckedAt: new Date().toISOString(),
    }));
  }

  async getExecutionTarget(decision: RouteDecision): Promise<ExecutionTarget> {
    return {
      adapter: this.id,
      provider: decision.selectedProvider,
      model: decision.selectedModel,
      baseUrl: 'http://localhost:4000',
      apiKeyManagedBy: 'gateway',
      method: 'gateway_call',
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    return {
      success: false,
      error: 'LiteLLM adapter does not execute directly. Delegate to LiteLLM proxy.',
      delegated: true,
    };
  }
}
