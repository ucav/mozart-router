import * as os from 'os';
import { execSync } from 'child_process';

export interface LocalCapability {
  os: string;
  arch: string;
  platform: string;
  cpu: { model: string; cores: number };
  ram: { totalGB: number; freeGB: number };
  gpu?: { model: string; vramGB?: number };
  ollamaAvailable: boolean;
  localModelCount: number;
}

function detectGpu(): { model: string; vramGB?: number } | undefined {
  // Try nvidia-smi (Linux / Windows with NVIDIA GPU)
  try {
    const out = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();
    if (out) {
      const firstLine = out.split('\n')[0].trim();
      const commaIdx = firstLine.lastIndexOf(',');
      const name = commaIdx > 0 ? firstLine.slice(0, commaIdx).trim() : firstLine;
      const memStr = commaIdx > 0 ? firstLine.slice(commaIdx + 1).trim() : '';
      const memMb = parseInt(memStr.replace(/[^0-9]/g, '') || '0', 10);
      return { model: name, vramGB: memMb > 0 ? Math.round((memMb / 1024) * 10) / 10 : undefined };
    }
  } catch { /* no nvidia-smi or no NVIDIA GPU */ }

  // Try macOS system_profiler
  if (process.platform === 'darwin') {
    try {
      const out = execSync('system_profiler SPDisplaysDataType -json', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
      });
      const data = JSON.parse(out) as {
        SPDisplaysDataType?: Array<{
          sppci_model?: string;
          _name?: string;
          spdisplays_vram?: string;
          spdisplays_vram_shared?: string;
        }>;
      };
      const entry = data?.SPDisplaysDataType?.[0];
      if (entry) {
        const name = entry.sppci_model ?? entry._name ?? 'Apple GPU';
        const vramStr = entry.spdisplays_vram ?? entry.spdisplays_vram_shared ?? '';
        const match = vramStr.match(/(\d+)/);
        let vramGB: number | undefined;
        if (match) {
          const raw = parseInt(match[1], 10);
          vramGB = vramStr.toUpperCase().includes('MB') ? Math.round((raw / 1024) * 10) / 10 : raw;
        }
        return { model: name, vramGB };
      }
    } catch { /* system_profiler not available or failed */ }
  }

  return undefined;
}

function checkOllamaAvailable(): { available: boolean; modelCount: number } {
  try {
    const listOut = execSync('ollama list', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();
    const lines = listOut.split('\n').filter((l) => l.trim() && !l.startsWith('NAME'));
    return { available: true, modelCount: lines.length };
  } catch {
    return { available: false, modelCount: 0 };
  }
}

export function scanLocalCapability(): LocalCapability {
  const totalRAM = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  const freeRAM = Math.round((os.freemem() / (1024 * 1024 * 1024)) * 10) / 10;

  const gpu = detectGpu();
  const { available: ollamaAvailable, modelCount: localModelCount } = checkOllamaAvailable();

  return {
    os: os.type(),
    arch: os.arch(),
    platform: os.platform(),
    cpu: {
      model: os.cpus()[0]?.model ?? 'unknown',
      cores: os.cpus().length,
    },
    ram: {
      totalGB: totalRAM,
      freeGB: freeRAM,
    },
    gpu,
    ollamaAvailable,
    localModelCount,
  };
}

export function estimateLocalModelCapacity(capability: LocalCapability): Array<{ modelSize: string; vramRequired: number; canRun: boolean }> {
  const vramGB = capability.gpu?.vramGB ?? 0;

  return [
    { modelSize: '7B (Q4)', vramRequired: 5, canRun: vramGB >= 5 || capability.ram.totalGB >= 8 },
    { modelSize: '13B (Q4)', vramRequired: 8, canRun: vramGB >= 8 || capability.ram.totalGB >= 16 },
    { modelSize: '34B (Q4)', vramRequired: 20, canRun: vramGB >= 20 },
    { modelSize: '70B (Q4)', vramRequired: 40, canRun: vramGB >= 40 },
  ];
}
