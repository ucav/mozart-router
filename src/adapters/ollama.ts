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
import { execSync } from 'child_process';
import * as os from 'os';

export class OllamaAdapter implements GatewayAdapter {
  id = 'ollama';
  name = 'Ollama';

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    let providersCount = 0;
    let modelsCount = 0;
    let status: DetectionResult['status'] = 'not_found';

    try {
      const ollamaPath = process.platform === 'win32'
        ? 'ollama.exe'
        : 'ollama';

      try {
        const version = execSync(`${ollamaPath} --version`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        details.push(`Ollama version: ${version}`);
        status = 'active';
      } catch {
        try {
          const homeDir = os.homedir();
          const altPaths = [
            `${homeDir}/.ollama`,
            '/usr/local/bin/ollama',
            '/opt/ollama',
          ];
          let found = false;
          for (const p of altPaths) {
            try {
              execSync(`test -f ${p}` as string);
              found = true;
              details.push(`Binary found at: ${p}`);
              break;
            } catch {
              // continue
            }
          }
          if (!found) {
            details.push('Ollama not found in PATH or common locations');
            status = 'not_found';
          } else {
            status = 'configured_only';
          }
        } catch {
          details.push('Ollama not detected');
          status = 'not_found';
        }
      }

      if (status !== 'not_found') {
        try {
          const listOutput = execSync(`${ollamaPath} list`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }).trim();
          const lines = listOutput.split('\n').filter((l) => l.trim() && !l.startsWith('NAME'));
          modelsCount = lines.length;
          providersCount = 1;
          details.push(`${modelsCount} models found`);
        } catch {
          details.push('Could not list models (ollama may not be running)');
          status = 'configured_only';
        }
      }
    } catch {
      details.push('Ollama detection failed');
      status = 'not_found';
    }

    return {
      detected: status !== 'not_found',
      gatewayId: this.id,
      gatewayName: this.name,
      status,
      providersCount,
      modelsCount,
      details,
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    const models: string[] = [];
    try {
      const ollamaPath = process.platform === 'win32' ? 'ollama.exe' : 'ollama';
      const listOutput = execSync(`${ollamaPath} list`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      const lines = listOutput.split('\n').slice(1);
      for (const line of lines) {
        const name = line.split(/\s+/)[0];
        if (name) models.push(name);
      }
    } catch {
      // ollama not running or not installed
    }

    return {
      gatewayId: this.id,
      gatewayName: this.name,
      providers: ['ollama'],
      models,
      capabilities: ['text', 'streaming', 'local'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    return [
      {
        id: 'ollama',
        name: 'Ollama Local',
        source: 'detected',
        gateway: this.id,
        baseUrl: 'http://localhost:11434',
        supportsModelsEndpoint: true,
        supportsStreaming: true,
        supportsTools: 'unknown',
        supportsJsonMode: 'unknown',
        privacyLevel: 'local',
        status: 'available',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async listModels(): Promise<Model[]> {
    const models: Model[] = [];
    try {
      const ollamaPath = process.platform === 'win32' ? 'ollama.exe' : 'ollama';
      const listOutput = execSync(`${ollamaPath} list`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      const lines = listOutput.split('\n').slice(1);
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const name = parts[0];
        if (!name) continue;
        models.push({
          id: name,
          providerId: 'ollama',
          gatewayId: this.id,
          displayName: name,
          modality: ['text'],
          contextWindow: 4096,
          latencyClass: 'medium',
          qualityClass: 'medium',
          strengths: ['local', 'free', 'private'],
          weaknesses: ['limited_context', 'no_vision'],
          privacyLevel: 'local',
          availability: 'available',
          sourceConfidence: 'high',
          lastCheckedAt: new Date().toISOString(),
        });
      }
    } catch {
      // no models
    }
    return models;
  }

  async getExecutionTarget(decision: RouteDecision): Promise<ExecutionTarget> {
    return {
      adapter: this.id,
      provider: decision.selectedProvider,
      model: decision.selectedModel,
      baseUrl: 'http://localhost:11434',
      apiKeyManagedBy: 'none',
      method: 'direct_http',
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      const host = request.executionTarget.baseUrl ?? 'http://localhost:11434';
      const response = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          prompt: request.input,
          stream: false,
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Ollama error: ${response.status}` };
      }

      const data = await response.json() as { response: string };
      return {
        success: true,
        output: data.response,
        tokens: { input: 0, output: 0, total: 0 },
        delegated: false,
      };
    } catch (err) {
      return { success: false, error: `Ollama execution failed: ${err}` };
    }
  }
}
