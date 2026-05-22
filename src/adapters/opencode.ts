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

function findOpenCodeDir(): string | null {
  const paths = [
    path.join(os.homedir(), '.opencode'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'OpenCode'),
    path.join(os.homedir(), '.config', 'opencode'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export class OpenCodeAdapter implements GatewayAdapter {
  id = 'opencode';
  name = 'OpenCode';

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];
    const isInstalled = !!(
      process.env.OPENCODE_CLIENT ||
      process.env.OPENCODE_SERVER_USERNAME ||
      findOpenCodeDir()
    );

    if (isInstalled) {
      details.push('OpenCode detected (environment variables present)');
      if (process.env.OPENCODE_CLIENT) details.push(`  Client: ${process.env.OPENCODE_CLIENT}`);
      if (process.env.OPENCODE_SERVER_USERNAME) details.push('  Server configured');

      const dir = findOpenCodeDir();
      if (dir) details.push(`  Data directory: ${dir}`);

      details.push('  Note: OpenCode manages providers internally. Mozart integrates as a skill/tool.');
      details.push('  See examples/opencode/mozart-skill.json for the integration manifest.');

      return {
        detected: true,
        gatewayId: this.id,
        gatewayName: this.name,
        status: 'configured_only',
        providersCount: 0,
        modelsCount: 0,
        details,
      };
    }

    return {
      detected: false,
      gatewayId: this.id,
      gatewayName: this.name,
      status: 'not_found',
      providersCount: 0,
      modelsCount: 0,
      details: ['OpenCode not detected. Install at https://opencode.ai'],
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    return {
      gatewayId: this.id,
      gatewayName: this.name,
      providers: [],
      models: [],
      capabilities: ['agent', 'coding', 'tools', 'file_editing', 'skill_system'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    return [];
  }

  async listModels(): Promise<Model[]> {
    return [];
  }
}
