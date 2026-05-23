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

function findConfigFiles(): { configPath?: string; authPath?: string; cachePath?: string } {
  const home = os.homedir();
  const configDir = path.join(home, '.config', 'opencode');
  const localDir = path.join(home, '.local', 'share', 'opencode');
  const cacheDir = path.join(home, '.cache', 'opencode');

  const result: { configPath?: string; authPath?: string; cachePath?: string } = {};

  for (const f of ['opencode.json', 'opencode.jsonc']) {
    const p = path.join(configDir, f);
    if (fs.existsSync(p)) { result.configPath = p; break; }
  }

  const authP = path.join(localDir, 'auth.json');
  if (fs.existsSync(authP)) result.authPath = authP;

  const cacheP = path.join(cacheDir, 'models.json');
  if (fs.existsSync(cacheP)) result.cachePath = cacheP;

  return result;
}

export class OpenCodeAdapter implements GatewayAdapter {
  id = 'opencode';
  name = 'OpenCode';

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    const isInstalled = !!(
      process.env.OPENCODE_CLIENT ||
      process.env.OPENCODE_SERVER_USERNAME ||
      findConfigFiles().configPath
    );

    if (!isInstalled) {
      return {
        detected: false, gatewayId: this.id, gatewayName: this.name,
        status: 'not_found', providersCount: 0, modelsCount: 0,
        details: ['OpenCode not detected. Install: npm install -g opencode-ai'],
      };
    }

    details.push('OpenCode detected');
    if (process.env.OPENCODE_CLIENT) details.push(`  Client: ${process.env.OPENCODE_CLIENT}`);

    const files = findConfigFiles();
    if (files.configPath) details.push(`  Config: ${files.configPath}`);
    if (files.authPath) details.push(`  Auth keys present (managed by OpenCode — Mozart does not read them)`);
    if (files.cachePath) {
      try {
        const cache = JSON.parse(fs.readFileSync(files.cachePath, 'utf-8'));
        const providers = new Set<string>();
        const modelIds: string[] = [];
        if (Array.isArray(cache)) {
          for (const entry of cache) {
            if (entry.provider) providers.add(entry.provider);
            if (entry.id) modelIds.push(entry.id);
          }
        }
        details.push(`  Models cache: ${modelIds.length} models from ${providers.size} providers`);
        for (const p of Array.from(providers).slice(0, 5)) details.push(`    - ${p}`);
        if (providers.size > 5) details.push(`    ... and ${providers.size - 5} more`);

        return {
          detected: true, gatewayId: this.id, gatewayName: this.name,
          configPath: files.configPath, configFormat: 'json',
          status: 'active', providersCount: providers.size, modelsCount: modelIds.length,
          details,
        };
      } catch {
        details.push('  Models cache: unreadable');
      }
    }

    details.push('  Note: Mozart integrates as a skill (.opencode/skills/mozart/SKILL.md)');
    details.push('  See examples/opencode/ for the skill manifest and SKILL.md');

    return {
      detected: true, gatewayId: this.id, gatewayName: this.name,
      configPath: files.configPath, configFormat: 'json',
      status: 'configured_only', providersCount: 0, modelsCount: 0,
      details,
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    const files = findConfigFiles();
    const providers: string[] = [];
    const models: string[] = [];

    if (files.cachePath) {
      try {
        const cache = JSON.parse(fs.readFileSync(files.cachePath, 'utf-8'));
        if (Array.isArray(cache)) {
          for (const entry of cache) {
            if (entry.provider) providers.push(entry.provider);
            if (entry.id) models.push(entry.id);
          }
        }
      } catch { /* ignore */ }
    }

    return {
      gatewayId: this.id, gatewayName: this.name,
      providers: Array.from(new Set(providers)),
      models: Array.from(new Set(models)),
      capabilities: ['agent', 'coding', 'tools', 'file_editing', 'skill_system', 'mcp'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    const summary = await this.readConfig();
    return Array.from(new Set(summary.providers)).map((name) => ({
      id: `opencode-${name}`,
      name,
      source: 'detected' as const,
      gateway: this.id,
      privacyLevel: name.includes('ollama') || name.includes('local') ? 'local' as const : 'cloud' as const,
      status: 'available' as const,
      lastCheckedAt: new Date().toISOString(),
    }));
  }

  async listModels(): Promise<Model[]> {
    const summary = await this.readConfig();
    return summary.models.map((id) => ({
      id,
      providerId: `opencode-${id.split('/')[0] || 'unknown'}`,
      gatewayId: this.id,
      displayName: id,
      modality: ['text'],
      contextWindow: 32768,
      latencyClass: 'medium' as const,
      qualityClass: 'medium' as const,
      strengths: ['opencode_managed'],
      weaknesses: ['capabilities_unknown'],
      privacyLevel: 'cloud' as const,
      availability: 'available' as const,
      sourceConfidence: 'medium' as const,
      lastCheckedAt: new Date().toISOString(),
    }));
  }
}
