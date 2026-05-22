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

let YAML: { parse: (str: string) => unknown } | null = null;
try {
  YAML = require('yaml');
} catch {
  // yaml package not available, fall back to simple parsing
}

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

    let providersCount = 0;
    let modelsCount = 0;

    if (foundConfig && configPath) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = this.parseConfig(content);
        const models = this.extractModels(parsed);
        const providers = new Set(models.map((m: string) => m.split('/')[0]));
        providersCount = providers.size;
        modelsCount = models.length;
        details.push(`${providersCount} provider(s), ${modelsCount} model(s)`);
        for (const m of models.slice(0, 10)) {
          details.push(`  - ${m}`);
        }
        if (models.length > 10) {
          details.push(`  ... and ${models.length - 10} more`);
        }
      } catch (err) {
        details.push(`Could not parse config: ${err}`);
      }
    }

    return {
      detected: foundConfig,
      gatewayId: this.id,
      gatewayName: this.name,
      configPath,
      configFormat: 'yaml',
      status: foundConfig ? 'active' : 'not_found',
      providersCount,
      modelsCount,
      details,
    };
  }

  private parseConfig(content: string): Record<string, unknown> {
    if (YAML) {
      return YAML.parse(content) as Record<string, unknown>;
    }
    // Fallback: simple line-by-line parsing
    const lines = content.split('\n');
    const result: Record<string, unknown> = {};
    const modelList: Array<{ model_name?: string; litellm_params?: { model?: string } }> = [];
    for (const line of lines) {
      const modelMatch = line.match(/^\s*-\s*model_name:\s*["']?([^"'\s#]+)/);
      if (modelMatch) {
        modelList.push({ model_name: modelMatch[1] });
      }
      const litellmMatch = line.match(/^\s*model:\s*["']?([^"'\s#]+)/);
      if (litellmMatch && modelList.length > 0) {
        const last = modelList[modelList.length - 1];
        if (!last.litellm_params) last.litellm_params = {};
        last.litellm_params.model = litellmMatch[1];
      }
    }
    result.model_list = modelList;
    return result;
  }

  private extractModels(config: Record<string, unknown>): string[] {
    const models: string[] = [];
    const modelList = config.model_list as Array<Record<string, unknown>> | undefined;
    if (modelList) {
      for (const entry of modelList) {
        const modelName = (entry.model_name as string) || (entry.litellm_params as Record<string, unknown>)?.model as string;
        if (modelName) models.push(modelName);
      }
    }
    return models;
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    const models: string[] = [];
    for (const p of this.configPaths()) {
      if (fs.existsSync(p)) {
        try {
          const parsed = this.parseConfig(fs.readFileSync(p, 'utf-8'));
          models.push(...this.extractModels(parsed));
        } catch { /* skip */ }
      }
    }
    return {
      gatewayId: this.id,
      gatewayName: this.name,
      providers: [],
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
