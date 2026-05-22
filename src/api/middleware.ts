import * as http from 'http';
import { Mozart } from '../core/mozart';

// Middleware mode: sits between an agent and its gateway,
// injecting Mozart routing decisions transparently.
// Exposes an OpenAI-compatible /v1/chat/completions endpoint
// that routes to the best available model via the detected gateways.

export interface MiddlewareOptions {
  port?: number;
  host?: string;
  upstreamUrl?: string; // fallback gateway URL if Mozart can't route
}

export class MozartMiddleware {
  private server: http.Server | null = null;
  private mozart: Mozart;
  private port: number;
  private host: string;
  private upstreamUrl: string;

  constructor(mozart: Mozart, options?: MiddlewareOptions) {
    this.mozart = mozart;
    this.port = options?.port ?? 4445;
    this.host = options?.host ?? '127.0.0.1';
    this.upstreamUrl = options?.upstreamUrl ?? 'http://localhost:4000'; // default LiteLLM
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);
      this.server.listen(this.port, this.host, () => {
        console.log(`Mozart Middleware (OpenAI-compatible) running at http://${this.host}:${this.port}`);
        console.log(`  POST /v1/chat/completions  — auto-routed by Mozart`);
        console.log(`  GET  /health                — health check`);
        console.log(`  GET  /v1/models             — available models`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) this.server.close(() => resolve());
      else resolve();
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    try {
      if (method === 'GET' && url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', mode: 'middleware' }));
      } else if (method === 'GET' && url === '/v1/models') {
        const snapshot = this.mozart.getInventory();
        const models = snapshot.models.map((m) => ({
          id: m.id,
          object: 'model',
          owned_by: m.providerId,
        }));
        res.writeHead(200);
        res.end(JSON.stringify({ object: 'list', data: models }));
      } else if (method === 'POST' && (url === '/v1/chat/completions' || url === '/chat/completions')) {
        await this.handleChatCompletion(req, res);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err) }));
    }
  }

  private async handleChatCompletion(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const messages = body.messages as Array<{ role: string; content: string }> ?? [];
    const userMessage = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    const requestedModel = body.model as string | undefined;

    // Let Mozart route the task
    const route = await this.mozart.route(userMessage);

    if (route.selectedModel === 'none') {
      // Fallback: forward to upstream gateway
      res.writeHead(200);
      res.end(JSON.stringify({
        id: 'mozart-fallback',
        object: 'chat.completion',
        model: requestedModel ?? 'unknown',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: `[Mozart] No suitable model found. Task: ${route.explanation[0]}. Run 'mozart doctor' to detect available models.`,
          },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        mozart_route: route,
      }));
      return;
    }

    // Try to execute via adapter
    const adapter = this.mozart.registry.getAdapter(route.selectedGateway);
    if (adapter?.execute) {
      const result = await adapter.execute({
        input: userMessage,
        model: route.selectedModel,
        provider: route.selectedProvider,
        gateway: route.selectedGateway,
        executionTarget: await (adapter.getExecutionTarget
          ? adapter.getExecutionTarget(route)
          : Promise.resolve({
              adapter: adapter.id,
              provider: route.selectedProvider,
              model: route.selectedModel,
              apiKeyManagedBy: 'gateway' as const,
              method: 'gateway_call' as const,
            })),
      });

      if (result.success && result.output) {
        res.writeHead(200);
        res.end(JSON.stringify({
          id: `mozart-${Date.now()}`,
          object: 'chat.completion',
          model: route.selectedModel,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: result.output },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: route.estimatedTokens.input,
            completion_tokens: route.estimatedTokens.output,
            total_tokens: route.estimatedTokens.total,
          },
          mozart_route: {
            provider: route.selectedProvider,
            model: route.selectedModel,
            confidence: route.confidence,
            estimated_cost: route.estimatedCost,
            explanation: route.explanation,
          },
        }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify({
        id: `mozart-${Date.now()}`,
        object: 'chat.completion',
        model: route.selectedModel,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: `[Mozart Route] Recommended: ${route.selectedProvider}/${route.selectedModel}\nExecution failed: ${result.error}\nRun via your gateway directly.`,
          },
          finish_reason: 'stop',
        }],
        mozart_route: route,
      }));
      return;
    }

    // Recommend-only: return the recommendation
    res.writeHead(200);
    res.end(JSON.stringify({
      id: `mozart-${Date.now()}`,
      object: 'chat.completion',
      model: route.selectedModel,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: `[Mozart Recommendation]\nUse: ${route.selectedGateway ?? 'direct'} / ${route.selectedProvider} / ${route.selectedModel}\nCost: $${route.estimatedCost.toFixed(4)}\nConfidence: ${Math.round(route.confidence * 100)}%\n\n${route.explanation.join('\n')}`,
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: route.estimatedTokens.input,
        completion_tokens: route.estimatedTokens.output,
        total_tokens: route.estimatedTokens.total,
      },
      mozart_route: route,
    }));
  }

  private readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); }
        catch { resolve({}); }
      });
    });
  }
}
