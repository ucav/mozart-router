// Interactive config initializer for Mozart.
// Called via `mozart config init` — walks user through setup.

import * as readline from 'readline';
import { generateDefaultConfig, loadMozartConfig } from '../policy/yaml-loader';
import { saveConfig } from '../core/persistence';
import { BUILTIN_PROFILES } from '../policy/profiles';

export async function interactiveConfigInit(): Promise<string> {
  const existing = loadMozartConfig();
  if (existing.loaded) {
    console.log(`Existing config found at ${existing.path}`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> => new Promise((r) => rl.question(q, r));

  console.log('\nMozart Configuration Wizard\n');

  // Profile selection
  console.log('Available profiles:');
  for (const p of BUILTIN_PROFILES) {
    console.log(`  ${p.name.padEnd(22)} ${p.description}`);
  }

  const profile = await ask('\nSelect profile [startup-budget]: ');
  const selectedProfile = profile.trim() || 'startup-budget';
  const found = BUILTIN_PROFILES.find((p) => p.name === selectedProfile);

  if (!found) {
    console.log(`Profile "${selectedProfile}" not found. Using startup-budget.`);
  }

  const mode = await ask('Default privacy mode [balanced]: ');
  const budget = await ask('Daily budget limit in USD [5]: ');

  rl.close();

  const config = generateDefaultConfig()
    .replace('profile: startup-budget', `profile: ${selectedProfile}`)
    .replace('mode: balanced', `mode: ${(mode.trim() || 'balanced')}`)
    .replace('daily_limit_usd: 5', `daily_limit_usd: ${parseFloat(budget.trim()) || 5}`);

  saveConfig(config);

  console.log('\nConfiguration saved. Run `mozart doctor` to detect your stack.');

  return config;
}
