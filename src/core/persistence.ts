import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { InventorySnapshot, SessionReport, RouteDecision } from '../types';

const DEFAULT_DIR = path.join(os.homedir(), '.mozart');

function ensureDir(): string {
  if (!fs.existsSync(DEFAULT_DIR)) {
    fs.mkdirSync(DEFAULT_DIR, { recursive: true });
  }
  return DEFAULT_DIR;
}

// ── Inventory Persistence ─────────────────────────────────

export function saveInventory(snapshot: InventorySnapshot): void {
  const dir = ensureDir();
  const filePath = path.join(dir, 'inventory.json');
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

export function loadInventory(): InventorySnapshot | null {
  const filePath = path.join(DEFAULT_DIR, 'inventory.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as InventorySnapshot;
  } catch {
    return null;
  }
}

// ── Session Persistence ───────────────────────────────────

export function saveSession(report: SessionReport, routes: RouteDecision[]): void {
  const dir = ensureDir();
  const filePath = path.join(dir, 'session.json');
  fs.writeFileSync(
    filePath,
    JSON.stringify({ report, routes, savedAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );
}

export function loadSession(): { report: SessionReport; routes: RouteDecision[] } | null {
  const filePath = path.join(DEFAULT_DIR, 'session.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ── Config Persistence ────────────────────────────────────

export function saveConfig(configYaml: string): void {
  const dir = ensureDir();
  const filePath = path.join(dir, 'config.yaml');
  fs.writeFileSync(filePath, configYaml, 'utf-8');
}

export function loadConfigYaml(): string | null {
  const filePath = path.join(DEFAULT_DIR, 'config.yaml');
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// ── Directory ─────────────────────────────────────────────

export function getMozartDir(): string {
  return ensureDir();
}

export function clearAllData(): void {
  const dir = DEFAULT_DIR;
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}
