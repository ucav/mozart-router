#!/usr/bin/env node

import { Mozart } from '../core/mozart';
import {
  OllamaAdapter,
  LiteLLMAdapter,
  OpenRouterAdapter,
  OpenCodeAdapter,
  OpenClawAdapter,
  HermesAdapter,
  CursorAdapter,
  LMStudioAdapter,
  VllmAdapter,
  NvidiaNimAdapter,
  discoverAllGenericAdapters,
} from '../adapters';
import { ALL_SKILLS } from '../skills';
import { BUILTIN_PROFILES, getProfile, applyProfile } from '../policy/profiles';
import { loadMozartConfig, generateDefaultConfig } from '../policy/yaml-loader';
import { saveInventory, loadInventory, saveConfig, clearAllData, getMozartDir } from '../core/persistence';
import { syncDealsForgeData } from '../utils/dealsforge';
import { scanLocalCapability, estimateLocalModelCapacity } from '../utils/canrunit';
import { startApiServer } from '../api/server';
import { MozartMiddleware } from '../api/middleware';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printHelp();
    return;
  }

  const mozart = new Mozart();

  // Register all adapters
  mozart.registry.registerAdapter(new OllamaAdapter());
  mozart.registry.registerAdapter(new LiteLLMAdapter());
  mozart.registry.registerAdapter(new OpenRouterAdapter());
  mozart.registry.registerAdapter(new OpenCodeAdapter());
  mozart.registry.registerAdapter(new OpenClawAdapter());
  mozart.registry.registerAdapter(new HermesAdapter());
  mozart.registry.registerAdapter(new CursorAdapter());
  mozart.registry.registerAdapter(new LMStudioAdapter());
  mozart.registry.registerAdapter(new VllmAdapter());
  mozart.registry.registerAdapter(new NvidiaNimAdapter());

  switch (command) {
    case 'doctor': await doctor(mozart); break;
    case 'inventory': await inventory(mozart); break;
    case 'simulate': await simulate(mozart, args.slice(1).join(' ')); break;
    case 'route': await route(mozart, args.slice(1).join(' ')); break;
    case 'why': await why(mozart); break;
    case 'report': await report(mozart); break;
    case 'skills': await listSkills(); break;
    case 'init': await init(args[1] || ''); break;
    case 'start': await start(mozart, args.slice(1)); break;
    case 'proxy': await proxy(mozart, args.slice(1)); break;
    case 'sync': await syncDealsforge(mozart); break;
    case 'scan-local': await scanLocal(mozart); break;
    case 'policy': await policy(args.slice(1)); break;
    case 'reset': await reset(); break;
    case 'profiles': await listProfiles(); break;
    case 'help':
    case '--help':
    case '-h': printHelp(); break;
    default:
      console.log(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

// ── Core commands ──────────────────────────────────────────

async function doctor(mozart: Mozart) {
  console.log('Mozart Doctor — Gateway & Stack Detection\n');

  for (const adapter of mozart.registry.listAdapters()) {
    process.stdout.write(`Checking ${adapter.name}... `);
    try {
      const detection = await adapter.detect();
      mozart.registry.recordDetection(detection);
      if (detection.detected) {
        console.log(`✅ ${detection.status}`);
        for (const detail of detection.details) console.log(`   ${detail}`);
        try {
          const providers = await adapter.listProviders();
          const models = await adapter.listModels();
          mozart.registry.mergeFromAdapter(adapter.id, providers, models);
        } catch { console.log('   (inventory merge skipped)'); }
      } else {
        console.log(`❌ ${detection.status}`);
        for (const detail of detection.details) console.log(`   ${detail}`);
      }
    } catch (err) { console.log(`⚠️ Error: ${err}`); }
    console.log('');
  }

  const snapshot = mozart.getInventory();
  console.log('Summary:');
  console.log(`  Gateways detected: ${snapshot.gateways.filter((g) => g.detected).length}`);
  console.log(`  Providers: ${snapshot.providers.length}`);
  console.log(`  Models: ${snapshot.models.length}`);
  console.log(`  Local models: ${snapshot.models.filter((m) => m.privacyLevel === 'local').length}`);
  console.log(`  Cloud models: ${snapshot.models.filter((m) => m.privacyLevel === 'cloud').length}`);

  // Auto-discover generic OpenAI-compatible endpoints
  console.log('\nAuto-discovering OpenAI-compatible endpoints...');
  try {
    const genericAdapters = await discoverAllGenericAdapters();
    for (const adapter of genericAdapters) {
      mozart.registry.registerAdapter(adapter);
      const providers = await adapter.listProviders();
      const models = await adapter.listModels();
      mozart.registry.mergeFromAdapter(adapter.id, providers, models);
      console.log(`  ✅ ${adapter.name} (${models.length} models)`);
    }
    if (genericAdapters.length === 0) {
      console.log('  No additional endpoints found.');
    }
  } catch { console.log('  Auto-discovery skipped.'); }

  const finalSnapshot = mozart.getInventory();

  saveInventory(snapshot);
  console.log(`\nInventory saved to ${getMozartDir()}/inventory.json`);
}

async function inventory(mozart: Mozart) {
  for (const adapter of mozart.registry.listAdapters()) {
    try {
      const detection = await adapter.detect();
      mozart.registry.recordDetection(detection);
      if (detection.detected) {
        const providers = await adapter.listProviders();
        const models = await adapter.listModels();
        mozart.registry.mergeFromAdapter(adapter.id, providers, models);
      }
    } catch { /* skip */ }
  }
  const snapshot = mozart.getInventory();
  console.log(JSON.stringify(snapshot, null, 2));
}

async function simulate(mozart: Mozart, task: string) {
  if (!task) { console.log('Please provide a task. Example: mozart simulate "debug my build error"'); return; }
  console.log(`Simulating routing for: "${task}"\n`);
  await detectAll(mozart);
  const result = await mozart.simulate(task);
  printRoute(result);
}

async function route(mozart: Mozart, task: string) {
  if (!task) { console.log('Please provide a task. Example: mozart route "write Playwright tests"'); return; }
  console.log(`Routing task: "${task}"\n`);
  await detectAll(mozart);
  const result = await mozart.route(task);
  console.log(JSON.stringify(result, null, 2));
}

async function why(mozart: Mozart) {
  await detectAll(mozart);
  // Run a quick simulation to populate session if needed
  if (mozart.explainLastRoute() === 'No routing decisions recorded yet.') {
    await mozart.simulate('test task');
  }
  console.log(mozart.explainLastRoute());
}

async function report(mozart: Mozart) {
  await detectAll(mozart);
  const tasks = ['debug build error', 'write tests', 'refactor auth', 'review security'];
  for (const task of tasks) {
    try { await mozart.simulate(task); } catch { /* skip */ }
  }
  console.log(mozart.generateReport());
}

async function listSkills() {
  console.log('Mozart Skills:\n');
  for (const skill of ALL_SKILLS) {
    console.log(`  ${skill.name}`);
    console.log(`    ${skill.description}`);
    const inputs = Object.keys(skill.input);
    if (inputs.length > 0) console.log(`    Inputs: ${inputs.join(', ')}`);
    console.log('');
  }
}

async function init(gateway: string) {
  if (!gateway) { console.log('Please specify a gateway: opencode, openclaw, hermes, litellm'); return; }
  const gw = gateway.replace('--gateway=', '').replace('--gateway', '');
  console.log(`Initializing Mozart for ${gw || 'unknown'}...`);
  console.log('\nIntegration files available in examples/ directory.');
  console.log('See docs/INTEGRATIONS.md for full instructions.\n');
  generateDefaultConfigFile();
}

// ── New commands ───────────────────────────────────────────

async function start(mozart: Mozart, args: string[]) {
  const portArg = args.find((a) => a.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1], 10) : 4444;

  console.log('Starting Mozart API server...');
  await detectAll(mozart);

  const server = await startApiServer(mozart, { port, host: '127.0.0.1' });
  console.log('\nPress Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}

async function proxy(mozart: Mozart, args: string[]) {
  const portArg = args.find((a) => a.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1], 10) : 4445;
  const upstreamArg = args.find((a) => a.startsWith('--upstream='));
  const upstream = upstreamArg ? upstreamArg.split('=')[1] : undefined;

  console.log('Starting Mozart Proxy (OpenAI-compatible middleware)...');
  await detectAll(mozart);

  const middleware = new MozartMiddleware(mozart, {
    port,
    host: '127.0.0.1',
    upstreamUrl: upstream,
  });
  await middleware.start();
  console.log('\nConfigure your agent to use: http://127.0.0.1:' + port + '/v1');
  console.log('Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await middleware.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await middleware.stop();
    process.exit(0);
  });
}

async function syncDealsforge(mozart: Mozart) {
  console.log('Syncing DealsForge data...');
  const result = syncDealsForgeData(mozart.registry);
  console.log(`  Models added: ${result.modelsAdded}`);
  console.log(`  Providers added: ${result.providersAdded}`);
  console.log('\nDealsForge sync complete. Run `mozart inventory` to see updated data.');
}

async function scanLocal(mozart: Mozart) {
  console.log('Scanning local capabilities...\n');
  const capability = scanLocalCapability();
  console.log(`OS: ${capability.os} (${capability.platform}, ${capability.arch})`);
  console.log(`CPU: ${capability.cpu.model} (${capability.cpu.cores} cores)`);
  console.log(`RAM: ${capability.ram.totalGB} GB total, ${capability.ram.freeGB} GB free`);
  if (capability.gpu) {
    console.log(`GPU: ${capability.gpu.model} (${capability.gpu.vramGB ?? 'unknown'} GB VRAM)`);
  } else {
    console.log('GPU: Not detected (requires native module)');
  }

  console.log('\nEstimated local model capacity:');
  const capacity = estimateLocalModelCapacity(capability);
  for (const c of capacity) {
    console.log(`  ${c.modelSize}: ${c.canRun ? '✅ Can run' : '❌ Cannot run'} (needs ~${c.vramRequired} GB VRAM)`);
  }

  console.log(`\nOllama available: ${capability.ollamaAvailable ? 'Yes' : 'No'}`);
  console.log(`Local models found: ${capability.localModelCount}`);
}

async function policy(args: string[]) {
  const subcommand = args[0];

  if (!subcommand || subcommand === 'list') {
    console.log('Available profiles:\n');
    for (const profile of BUILTIN_PROFILES) {
      console.log(`  ${profile.name.padEnd(22)} ${profile.description}`);
    }
    console.log('\nUse `mozart profiles` for more details.');
    return;
  }

  if (subcommand === 'show') {
    const name = args[1];
    if (!name) { console.log('Usage: mozart policy show <profile-name>'); return; }
    const profile = getProfile(name);
    if (!profile) { console.log(`Profile "${name}" not found. Use "mozart policy list" to see available profiles.`); return; }
    console.log(JSON.stringify(profile, null, 2));
    return;
  }

  if (subcommand === 'set') {
    const name = args[1];
    if (!name) { console.log('Usage: mozart policy set <profile-name>'); return; }
    const profile = getProfile(name);
    if (!profile) { console.log(`Profile "${name}" not found.`); return; }
    const config = loadMozartConfig().config;
    const updated = applyProfile(config, name);
    const yaml = generateDefaultConfig();
    saveConfig(yaml);
    console.log(`Policy profile set to: ${name}`);
    console.log(`Config saved to ${getMozartDir()}/config.yaml`);
    return;
  }

  console.log(`Unknown policy subcommand: ${subcommand}`);
  console.log('Usage: mozart policy [list|show|set]');
}

async function listProfiles() {
  console.log('Mozart Built-in Profiles:\n');
  for (const profile of BUILTIN_PROFILES) {
    console.log(`  ${profile.name}`);
    console.log(`    ${profile.description}`);
    console.log(`    Mode: ${profile.policy.mode}`);
    console.log(`    Privacy: ${profile.policy.privacy?.mode}`);
    console.log(`    Budget: ${profile.policy.budget?.mode} (limit: $${profile.policy.budget?.dailyLimitUsd}/day)`);
    console.log('');
  }
}

async function reset() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('This will clear all Mozart local data (inventory, session, config).');
  const answer = await new Promise<string>((resolve) => {
    readline.question('Are you sure? [y/N] ', resolve);
  });
  readline.close();

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    clearAllData();
    console.log('All Mozart data cleared.');
  } else {
    console.log('Cancelled.');
  }
}

// ── Helpers ────────────────────────────────────────────────

async function detectAll(mozart: Mozart) {
  for (const adapter of mozart.registry.listAdapters()) {
    try {
      const detection = await adapter.detect();
      mozart.registry.recordDetection(detection);
      if (detection.detected) {
        const providers = await adapter.listProviders();
        const models = await adapter.listModels();
        mozart.registry.mergeFromAdapter(adapter.id, providers, models);
      }
    } catch { /* skip */ }
  }

  // Auto-discover any OpenAI-compatible endpoints
  try {
    const genericAdapters = await discoverAllGenericAdapters();
    for (const adapter of genericAdapters) {
      mozart.registry.registerAdapter(adapter);
      const providers = await adapter.listProviders();
      const models = await adapter.listModels();
      mozart.registry.mergeFromAdapter(adapter.id, providers, models);
    }
  } catch { /* skip */ }
}

function printRoute(result: { selectedGateway?: string; selectedProvider: string; selectedModel: string; score: number; confidence: number; contextStrategy: string; estimatedCost: number; explanation: string[] }) {
  console.log(`Selected: ${result.selectedGateway ?? 'direct'} / ${result.selectedProvider} / ${result.selectedModel}`);
  console.log(`Score: ${result.score}`);
  console.log(`Confidence: ${Math.round(result.confidence * 100)}%`);
  console.log(`Context strategy: ${result.contextStrategy}`);
  console.log(`Estimated cost: $${result.estimatedCost.toFixed(4)}`);
  console.log('');
  for (const line of result.explanation) console.log(`  ${line}`);
}

function generateDefaultConfigFile() {
  const config = generateDefaultConfig();
  saveConfig(config);
  console.log(`Default config generated at ${getMozartDir()}/config.yaml`);
}

function printHelp() {
  console.log(`
Mozart — Local orchestration and routing for AI agents.

Usage:
  mozart doctor                     Detect gateways, providers, and models
  mozart inventory                  Show full inventory as JSON
  mozart simulate <task>            Simulate routing for a task
  mozart route <task>               Route a task (recommend mode)
  mozart why                        Explain the last routing decision
  mozart report                     Show session report
  mozart skills                     List available Mozart skills
  mozart profiles                   List built-in policy profiles
  mozart init --gateway <name>     Generate integration files

  mozart start [--port=4444]        Start local HTTP API server
  mozart proxy [--port=4445]        Start OpenAI-compatible proxy/middleware
  mozart sync dealsforge            Sync DealsForge provider/model data
  mozart scan-local                 Scan local hardware capabilities
  mozart policy list|show|set       Manage routing policies
  mozart reset                      Clear all Mozart local data
  mozart help                       Show this help

Protocol:
  Do not rebuild what the gateway already does.
  Detect it, understand it, orchestrate it.
`);
}

main().catch((err) => {
  console.error('Mozart CLI error:', err);
  process.exit(1);
});
