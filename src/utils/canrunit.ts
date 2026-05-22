import * as os from 'os';

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

export function scanLocalCapability(): LocalCapability {
  const totalRAM = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  const freeRAM = Math.round((os.freemem() / (1024 * 1024 * 1024)) * 10) / 10;

  const result: LocalCapability = {
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
    ollamaAvailable: false,
    localModelCount: 0,
  };

  // GPU detection placeholder (requires native modules)
  return result;
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
