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
import { StreamingMiddleware } from '../api/streaming';
import { MozartMcpServer } from '../api/mcp';
import { pluginRegistry } from '../core/plugins';
import { HealthChecker } from '../core/health';
import { MetricsCollector } from '../core/metrics';
import { DynamicPricing } from '../cost/dynamic-pricing';
import { ReliabilityTracker } from '../core/reliability';
import { interactiveConfigInit } from './config-init';

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
    case 'stream': await stream(mozart, args.slice(1)); break;
    case 'proxy': await proxy(mozart, args.slice(1)); break;
    case 'mcp': await mcp(mozart, args.slice(1)); break;
    case 'sync': await syncDealsforge(mozart); break;
    case 'scan-local': await scanLocal(mozart); break;
    case 'policy': await policy(args.slice(1)); break;
    case 'reset': await reset(); break;
    case 'profiles': await listProfiles(); break;
    case 'config': await configCommand(args.slice(1)); break;
    case 'plugins': await pluginsList(); break;
    case 'metrics': await metricsCommand(mozart); break;
    case 'pricing': await pricingCommand(mozart, args.slice(1)); break;
    case 'health': await healthCommand(mozart); break;
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

  saveInventory(finalSnapshot);
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
  if (!gw || gw === '--gateway') { console.log('Please specify a gateway name'); return; }
  console.log(`Initializing Mozart for ${gw}...`);
  console.log(`\nIntegration manifest: examples/${gw}/`);
  console.log('1. Copy the manifest to your agent config directory');
  console.log('2. Install Mozart: npm install mozart-router');
  console.log('3. Import SDK: import { Mozart } from \'mozart-router\'');

  switch (gw) {
    case 'opencode':
      console.log('\nOpenCode: Place .opencode/skills/mozart/SKILL.md in your project');
      console.log('  See: examples/opencode/SKILL.md');
      break;
    case 'openclaw':
      console.log('\nOpenClaw: Add mozart skills to your openclaw.json config');
      console.log('  See: examples/openclaw/mozart-skill.yaml');
      break;
    case 'hermes':
      console.log('\nHermes: Add mozart tools to your agent configuration');
      console.log('  See: examples/hermes/mozart-tool.json');
      break;
    case 'litellm':
      console.log('\nLiteLLM: Mozart auto-detects your litellm_config.yaml');
      console.log('  No manual setup needed. Run `mozart doctor`.');
      break;
    default:
      console.log(`\nGeneric integration: See examples/generic-tools/mozart-tools.json`);
  }

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

async function scanLocal(_mozart: Mozart) {
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

// ── New extended commands ──────────────────────────────────

async function stream(mozart: Mozart, args: string[]) {
  const portArg = args.find((a) => a.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1], 10) : 4445;
  console.log('Starting Mozart Streaming Middleware...');
  await detectAll(mozart);
  const middleware = new StreamingMiddleware(mozart, { port, host: '127.0.0.1' });
  await middleware.start();
  console.log('\nStreaming endpoint: http://127.0.0.1:' + port + '/v1/chat/completions');
  console.log('Supports: stream=true (SSE) and stream=false (JSON)');
  console.log('Press Ctrl+C to stop.');
  process.on('SIGINT', async () => { await middleware.stop(); process.exit(0); });
  process.on('SIGTERM', async () => { await middleware.stop(); process.exit(0); });
}

async function mcp(mozart: Mozart, _args: string[]) {
  console.log('Mozart MCP Server starting (stdio mode)...');
  await detectAll(mozart);
  const mcpServer = new MozartMcpServer(mozart);

  // Read JSON-RPC from stdin, write to stdout
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin });
  let buffer = '';
  rl.on('line', async (line: string) => {
    buffer += line;
    try {
      const request = JSON.parse(buffer);
      buffer = '';
      const response = await mcpServer.handleRequest(request);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch {
      // Wait for more input (incomplete JSON)
    }
  });
}

async function configCommand(args: string[]) {
  if (args[0] === 'init') {
    await interactiveConfigInit();
  } else {
    console.log('Usage: mozart config init');
    console.log('\nManage Mozart configuration.');
    console.log('  init    Run interactive setup wizard');
    console.log('\nOr edit ~/.mozart/config.yaml directly.');
  }
}

async function pluginsList() {
  const plugins = pluginRegistry.list();
  if (plugins.length === 0) {
    console.log('No plugins registered.');
    console.log('Install plugins via: npm install mozart-router-adapter-<name>');
    return;
  }
  console.log('Registered plugins:');
  for (const p of plugins) {
    console.log(`  ${p.name} v${p.version} (${p.adapters.length} adapters)`);
  }
}

async function metricsCommand(mozart: Mozart) {
  await detectAll(mozart);
  const snapshot = mozart.getInventory();
  const activeGateways = snapshot.gateways.filter((g) => g.detected).length;

  // Simulate a few routes to populate metrics
  const tasks = ['debug error', 'write tests', 'hello world'];
  for (const task of tasks) {
    try { await mozart.simulate(task); } catch { /* skip */ }
  }

  const collector = new MetricsCollector();
  // Routes have already been recorded by mozart.session
  // (MetricsCollector is for standalone use — show what it would export)
  const prometheus = collector.toPrometheus();
  const json = collector.toJSON();

  console.log('=== JSON Metrics ===');
  console.log(JSON.stringify({
    routes: mozart.session['routes']?.length ?? 0,
    gateways_active: activeGateways,
    gateways_total: snapshot.gateways.length,
    models_total: snapshot.models.length,
  }, null, 2));

  console.log('\n=== Prometheus Metrics ===');
  console.log(prometheus);
}

async function healthCommand(mozart: Mozart) {
  console.log('Provider Health Check\n');
  await detectAll(mozart);
  const checker = new HealthChecker({ checkIntervalMs: 60000 });
  for (const adapter of mozart.registry.listAdapters()) {
    checker.register(adapter);
  }

  const results = await checker.checkAll();
  for (const r of results) {
    const icon = r.status.connected ? '✅' : '❌';
    const error = r.status.error ? ` (${r.status.error})` : '';
    const latency = r.status.latencyMs ? ` ${r.status.latencyMs}ms` : '';
    console.log(`  ${icon} ${r.adapterName}${latency}${error}`);
  }
  console.log('');
}

async function pricingCommand(mozart: Mozart, args: string[]) {
  if (args[0] === 'sync') {
    console.log('Fetching live pricing from OpenRouter...');
    const pricing = new DynamicPricing();
    const results = await pricing.fetchOpenRouter();
    console.log(`Fetched ${results.length} model prices from OpenRouter.`);

    // Enrich existing models
    const models = mozart.registry.listModels();
    const enriched = pricing.enrichModels(models, results);
    let updated = 0;
    for (const model of enriched) {
      const existing = mozart.registry.getModel(model.providerId, model.id);
      if (existing && (existing.inputPrice !== model.inputPrice || existing.contextWindow !== model.contextWindow)) {
        mozart.registry.addModel(model);
        updated++;
      }
    }
    console.log(`Updated ${updated} models with live pricing data.`);
    console.log(`Sample prices (per 1M tokens):`);
    for (const r of results.slice(0, 5)) {
      console.log(`  ${r.modelId}: $${(r.inputPrice ?? 0).toFixed(2)} input / $${(r.outputPrice ?? 0).toFixed(2)} output`);
    }
  } else if (args[0] === 'list') {
    const pricing = new DynamicPricing();
    const cached = pricing.getAllPrices();
    if (cached.length === 0) {
      console.log('No pricing cached. Run `mozart pricing sync` first.');
    } else {
      for (const p of cached.slice(0, 10)) {
        console.log(`  ${p.modelId}: in=$${p.inputPrice} out=$${p.outputPrice} (ctx=${p.contextWindow})`);
      }
    }
  } else {
    console.log('Usage: mozart pricing sync|list');
  }
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
  mozart stream [--port=4445]       Start streaming middleware (SSE)
  mozart proxy [--port=4445]        Start OpenAI-compatible proxy/middleware
  mozart mcp                        Start MCP server (stdin/stdout)
  mozart config init                Interactive config generator
  mozart plugins                    List registered plugins
  mozart metrics                    Export metrics (JSON + Prometheus)
  mozart pricing sync|list           Fetch live model pricing data
  mozart health                     Run health check on all adapters
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
