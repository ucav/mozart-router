import * as http from 'http';
import { Mozart } from '../core/mozart';

// Streaming-enhanced middleware proxy.
// Adds SSE streaming to the existing OpenAI-compatible endpoint.
// Non-streaming requests use the original handler; streaming uses SSE.

export interface StreamingMiddlewareOptions {
  port?: number;
  host?: string;
}

export class StreamingMiddleware {
  private server: http.Server | null = null;
  private mozart: Mozart;
  private port: number;
  private host: string;

  constructor(mozart: Mozart, options?: StreamingMiddlewareOptions) {
    this.mozart = mozart;
    this.port = options?.port ?? 4445;
    this.host = options?.host ?? '127.0.0.1';
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });
      this.server.on('error', reject);
      this.server.listen(this.port, this.host, () => {
        console.log(`Mozart Streaming Middleware running at http://${this.host}:${this.port}`);
        console.log(`  POST /v1/chat/completions  (streaming + non-streaming)`);
        console.log(`  GET  /health`);
        console.log(`  GET  /v1/models`);
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    try {
      if (method === 'GET' && url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', mode: 'streaming-middleware' }));
      } else if (method === 'GET' && url === '/v1/models') {
        const snapshot = this.mozart.getInventory();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ object: 'list', data: snapshot.models.map((m) => ({ id: m.id, object: 'model', owned_by: m.providerId })) }));
      } else if (method === 'POST' && (url === '/v1/chat/completions' || url === '/chat/completions')) {
        await this.handleChatCompletion(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
  }

  private async handleChatCompletion(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const messages = body.messages as Array<{ role: string; content: string }> ?? [];
    const userMessage = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    const stream = body.stream === true;

    const route = await this.mozart.route(userMessage);

    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      // Send the Mozart route metadata as the first chunk
      const metaChunk = {
        id: `mozart-${Date.now()}`,
        object: 'chat.completion.chunk',
        model: route.selectedModel,
        choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null as string | null }],
        mozart_route: {
          provider: route.selectedProvider,
          model: route.selectedModel,
          confidence: route.confidence,
          estimated_cost: route.estimatedCost,
          context_strategy: route.contextStrategy,
        },
      };
      res.write(`data: ${JSON.stringify(metaChunk)}\n\n`);

      // Send explanation as streamed content
      for (const line of route.explanation) {
        const chunk = {
          id: `mozart-${Date.now()}`,
          object: 'chat.completion.chunk',
          model: route.selectedModel,
          choices: [{ index: 0, delta: { content: line + '\n' }, finish_reason: null }],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        await this.sleep(50); // simulate streaming cadence
      }

      // Try delegate execution and stream result
      const adapter = this.mozart.registry.getAdapter(route.selectedGateway);
      if (adapter?.execute) {
        try {
          const execResult = await adapter.execute({
            input: userMessage,
            model: route.selectedModel,
            provider: route.selectedProvider,
            gateway: route.selectedGateway,
            executionTarget: {
              adapter: adapter.id,
              provider: route.selectedProvider,
              model: route.selectedModel,
              apiKeyManagedBy: 'none',
              method: 'gateway_call',
            },
          });

          if (execResult.success && execResult.output) {
            const words = execResult.output.split(' ');
            for (const word of words) {
              const chunk = {
                id: `mozart-${Date.now()}`,
                object: 'chat.completion.chunk',
                model: route.selectedModel,
                choices: [{ index: 0, delta: { content: word + ' ' }, finish_reason: null }],
              };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              await this.sleep(20);
            }
          }
        } catch {
          // execution failed, already sent recommendation
        }
      } else {
        // Recommend-only: send the recommendation
        const recLines = [
          `[Mozart Recommendation]`,
          `Use: ${route.selectedGateway ?? 'direct'} / ${route.selectedProvider} / ${route.selectedModel}`,
          `Cost: $${route.estimatedCost.toFixed(4)}`,
          `Confidence: ${Math.round(route.confidence * 100)}%`,
          ``,
          ...route.explanation,
        ];
        for (const line of recLines) {
          const chunk = {
            id: `mozart-${Date.now()}`,
            object: 'chat.completion.chunk',
            model: route.selectedModel,
            choices: [{ index: 0, delta: { content: line + '\n' }, finish_reason: null }],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          await this.sleep(30);
        }
      }

      // Final chunk
      const finalChunk = {
        id: `mozart-${Date.now()}`,
        object: 'chat.completion.chunk',
        model: route.selectedModel,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      };
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming: same as original middleware
      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (route.selectedModel === 'none') {
        res.end(JSON.stringify({
          id: 'mozart-fallback',
          object: 'chat.completion',
          model: 'none',
          choices: [{ index: 0, message: { role: 'assistant', content: `[Mozart] ${route.explanation[0]}` }, finish_reason: 'stop' }],
          mozart_route: route,
        }));
        return;
      }

      const adapter = this.mozart.registry.getAdapter(route.selectedGateway);
      let output = `[Mozart Recommendation]\nUse: ${route.selectedGateway ?? 'direct'} / ${route.selectedProvider} / ${route.selectedModel}\nCost: $${route.estimatedCost.toFixed(4)}\n\n${route.explanation.join('\n')}`;

      if (adapter?.execute) {
        try {
          const execResult = await adapter.execute({
            input: userMessage,
            model: route.selectedModel,
            provider: route.selectedProvider,
            gateway: route.selectedGateway,
            executionTarget: {
              adapter: adapter.id,
              provider: route.selectedProvider,
              model: route.selectedModel,
              apiKeyManagedBy: 'none',
              method: 'gateway_call',
            },
          });
          if (execResult.success && execResult.output) {
            output = execResult.output;
          }
        } catch { /* use recommendation */ }
      }

      res.end(JSON.stringify({
        id: `mozart-${Date.now()}`,
        object: 'chat.completion',
        model: route.selectedModel,
        choices: [{ index: 0, message: { role: 'assistant', content: output }, finish_reason: 'stop' }],
        usage: { prompt_tokens: route.estimatedTokens.input, completion_tokens: route.estimatedTokens.output, total_tokens: route.estimatedTokens.total },
        mozart_route: route,
      }));
    }
  }

  private readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => { data += c; });
      req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); }
        catch { resolve({}); }
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
