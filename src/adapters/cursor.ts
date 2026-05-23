import {
  GatewayAdapter,
  DetectionResult,
  GatewayConfigSummary,
  Provider,
  Model,
} from '../types';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getCursorConfigDirs(): string[] {
  const home = os.homedir();
  if (process.platform === 'darwin') {
    return [
      path.join(home, 'Library', 'Application Support', 'Cursor'),
      path.join(home, '.cursor'),
    ];
  }
  if (process.platform === 'win32') {
    return [
      path.join(process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'Cursor'),
      path.join(home, '.cursor'),
    ];
  }
  return [
    path.join(home, '.config', 'Cursor'),
    path.join(home, '.cursor'),
  ];
}

function findCursorConfig(): string | undefined {
  for (const dir of getCursorConfigDirs()) {
    if (fs.existsSync(dir)) return dir;
  }
  return undefined;
}

function isCursorBinaryAvailable(): boolean {
  try {
    execSync('cursor --version', { stdio: 'pipe', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Cursor bundles a fixed set of models (managed by the IDE, not the user's keys).
// This list reflects the models available as of the last documented update.
const CURSOR_MODELS: Model[] = [
  {
    id: 'cursor-small',
    providerId: 'cursor',
    gatewayId: 'cursor',
    displayName: 'Cursor Small',
    family: 'cursor',
    modality: ['text'],
    contextWindow: 8192,
    latencyClass: 'fast',
    qualityClass: 'medium',
    strengths: ['fast', 'coding', 'autocomplete'],
    weaknesses: ['limited_context'],
    privacyLevel: 'cloud',
    availability: 'available',
    sourceConfidence: 'high',
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'gpt-4o',
    providerId: 'cursor',
    gatewayId: 'cursor',
    displayName: 'GPT-4o (via Cursor)',
    family: 'gpt',
    modality: ['text', 'vision'],
    contextWindow: 128000,
    latencyClass: 'medium',
    qualityClass: 'premium',
    strengths: ['coding', 'reasoning', 'vision'],
    weaknesses: ['expensive'],
    supportsTools: true,
    supportsJsonMode: true,
    privacyLevel: 'cloud',
    availability: 'available',
    sourceConfidence: 'high',
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'claude-3-5-sonnet',
    providerId: 'cursor',
    gatewayId: 'cursor',
    displayName: 'Claude 3.5 Sonnet (via Cursor)',
    family: 'claude',
    modality: ['text'],
    contextWindow: 200000,
    latencyClass: 'medium',
    qualityClass: 'premium',
    strengths: ['coding', 'reasoning', 'long_context'],
    weaknesses: ['expensive'],
    supportsTools: true,
    privacyLevel: 'cloud',
    availability: 'available',
    sourceConfidence: 'high',
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'gemini-2.5-pro',
    providerId: 'cursor',
    gatewayId: 'cursor',
    displayName: 'Gemini 2.5 Pro (via Cursor)',
    family: 'gemini',
    modality: ['text', 'vision'],
    contextWindow: 1048576,
    latencyClass: 'medium',
    qualityClass: 'premium',
    strengths: ['long_context', 'reasoning', 'coding'],
    weaknesses: [],
    supportsTools: true,
    privacyLevel: 'cloud',
    availability: 'available',
    sourceConfidence: 'high',
    lastCheckedAt: new Date().toISOString(),
  },
];

export class CursorAdapter implements GatewayAdapter {
  id = 'cursor';
  name = 'Cursor';

  async detect(): Promise<DetectionResult> {
    const details: string[] = [];

    const binaryFound = isCursorBinaryAvailable();
    if (binaryFound) {
      details.push('Cursor binary found in PATH');
    }

    const configDir = findCursorConfig();
    if (configDir) {
      details.push(`Cursor config directory found: ${configDir}`);
    }

    const detected = binaryFound || !!configDir;

    if (!detected) {
      details.push('Cursor not detected (binary not in PATH, config directory not found)');
      details.push('Mozart can be used as an advisory layer for Cursor via MCP or CLI.');
    } else {
      details.push('Mozart integrates with Cursor via MCP server (mozart mcp) or as a local API endpoint.');
      details.push('Models are managed by Cursor — Mozart recommends routing, Cursor executes.');
    }

    return {
      detected,
      gatewayId: this.id,
      gatewayName: this.name,
      configPath: configDir,
      status: binaryFound ? 'active' : (configDir ? 'configured_only' : 'not_found'),
      providersCount: detected ? 1 : 0,
      modelsCount: detected ? CURSOR_MODELS.length : 0,
      details,
    };
  }

  async readConfig(): Promise<GatewayConfigSummary> {
    return {
      gatewayId: this.id,
      gatewayName: this.name,
      providers: ['cursor'],
      models: CURSOR_MODELS.map((m) => m.id),
      capabilities: ['ide', 'coding', 'agent', 'editing', 'mcp'],
    };
  }

  async listProviders(): Promise<Provider[]> {
    const detected = isCursorBinaryAvailable() || !!findCursorConfig();
    if (!detected) return [];

    return [
      {
        id: 'cursor',
        name: 'Cursor',
        source: 'detected',
        gateway: this.id,
        supportsModelsEndpoint: false,
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: true,
        privacyLevel: 'cloud',
        status: 'available',
        lastCheckedAt: new Date().toISOString(),
      },
    ];
  }

  async listModels(): Promise<Model[]> {
    const detected = isCursorBinaryAvailable() || !!findCursorConfig();
    if (!detected) return [];
    return CURSOR_MODELS;
  }
}
