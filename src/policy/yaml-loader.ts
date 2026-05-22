import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PolicyConfig, DEFAULT_POLICY } from '../types';

export interface LoadResult {
  loaded: boolean;
  path?: string;
  config: PolicyConfig;
  errors: string[];
}

export function loadMozartConfig(customPath?: string): LoadResult {
  const searchPaths = customPath
    ? [customPath]
    : [
        path.join(process.cwd(), 'mozart.config.yaml'),
        path.join(process.cwd(), 'mozart.config.yml'),
        path.join(os.homedir(), '.mozart', 'config.yaml'),
        path.join(os.homedir(), '.mozart', 'config.yml'),
      ];

  const errors: string[] = [];

  for (const configPath of searchPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = parseSimpleYaml(content);
        const merged = deepMerge(DEFAULT_POLICY as unknown as Record<string, unknown>, parsed) as unknown as PolicyConfig;
        return { loaded: true, path: configPath, config: merged, errors: [] };
      } catch (err) {
        errors.push(`${configPath}: ${err}`);
      }
    }
  }

  return {
    loaded: false,
    config: { ...DEFAULT_POLICY },
    errors: errors.length > 0 ? errors : ['No mozart.config.yaml found'],
  };
}

function parseSimpleYaml(content: string): Record<string, unknown> {
  const lines = content.split('\n');
  const root: Record<string, unknown> = {};
  let currentSection: string | null = null;
  let currentObj: Record<string, unknown> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    if (indent === 0) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        currentSection = trimmed.substring(0, colonIdx).trim();
        currentObj = {};
        root[currentSection] = currentObj;
      }
    } else if (indent === 2 && currentSection) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const key = trimmed.substring(0, colonIdx).trim();
        const valueStr = trimmed.substring(colonIdx + 1).trim();

        let value: unknown = valueStr;
        if (valueStr === 'true') value = true;
        else if (valueStr === 'false') value = false;
        else if (/^-?\d+(\.\d+)?$/.test(valueStr)) value = parseFloat(valueStr);

        currentObj[key] = value;
      }
    }
  }

  return root;
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(override)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      key in result &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function generateDefaultConfig(): string {
  return `# Mozart configuration
# https://github.com/mozart-router

mode: local_first
profile: startup-budget

privacy:
  mode: balanced
  secrets: local_only
  env_files: block_cloud
  customer_data: trusted_only

budget:
  mode: balanced
  daily_limit_usd: 5
  warn_at_percent: 80

routing:
  explain: true
  fallback: true
  cheap_first: true
  premium_for_critical: true
  max_retries: 2
  prefer_local_for_simple_tasks: true
  allow_cloud_for_code: true
  allow_cloud_for_sensitive_files: false

logs:
  enabled: true
  redact_secrets: true
  retention_days: 30
`;
}
