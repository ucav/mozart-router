// Example: Using Mozart with Ollama for local model routing
//
// This example demonstrates:
// 1. Creating a Mozart instance
// 2. Registering the Ollama adapter
// 3. Building an inventory from local models
// 4. Routing tasks to local vs cloud models

import { Mozart, OllamaAdapter, OpenRouterAdapter } from 'mozart-router';

async function main() {
  const mozart = new Mozart();

  // Register adapters - Mozart detects available gateways
  mozart.registry.registerAdapter(new OllamaAdapter());
  mozart.registry.registerAdapter(new OpenRouterAdapter());

  // Detect all gateways and build inventory
  for (const adapter of mozart.registry.listAdapters()) {
    const detection = await adapter.detect();
    mozart.registry.recordDetection(detection);

    if (detection.detected) {
      console.log(`Found: ${adapter.name} (${detection.status})`);
      const providers = await adapter.listProviders();
      const models = await adapter.listModels();
      mozart.registry.mergeFromAdapter(adapter.id, providers, models);
      console.log(`  ${models.length} models available`);
    }
  }

  // Show inventory
  const snapshot = mozart.getInventory();
  console.log(`\nTotal: ${snapshot.models.length} models`);

  // Route a simple task - Mozart will prefer local models
  const simpleRoute = await mozart.recommend('hello, how are you?');
  console.log(`\nSimple task → ${simpleRoute.selectedModel} ($${simpleRoute.estimatedCost})`);

  // Route a coding task - Mozart will select best coding model
  const codeRoute = await mozart.recommend('write a function to sort an array');
  console.log(`Code task → ${codeRoute.selectedModel} ($${codeRoute.estimatedCost})`);

  // Full process with privacy and cost analysis
  const response = await mozart.process({
    input: 'debug the authentication flow',
    budgetMode: 'balanced',
    privacyMode: 'balanced',
    executionMode: 'recommend',
  });

  console.log(`\nFull response:`);
  console.log(`  Selected: ${response.route.selectedModel}`);
  console.log(`  Cost: $${response.cost.totalCost.toFixed(4)}`);
  console.log(`  Privacy: ${response.privacy.action}`);
  console.log(`  ${response.explanation.length} explanation lines`);
}

main().catch(console.error);
