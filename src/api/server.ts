import * as http from 'http';
import { Mozart } from '../core/mozart';
import { MozartRequest, BudgetMode, PrivacyMode } from '../types';
import { dashboardHtml } from './dashboard';

export interface ApiServerOptions {
  port?: number;
  host?: string;
}

export class MozartApiServer {
  private server: http.Server | null = null;
  private mozart: Mozart;
  private port: number;
  private host: string;

  constructor(mozart: Mozart, options?: ApiServerOptions) {
    this.mozart = mozart;
    this.port = options?.port ?? 4444;
    this.host = options?.host ?? '127.0.0.1';
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        console.error('Mozart API server error:', err);
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`Mozart API running at http://${this.host}:${this.port}`);
        console.log(`Endpoints:`);
        console.log(`  GET  /health`);
        console.log(`  GET  /v1/inventory`);
        console.log(`  POST /v1/route`);
        console.log(`  POST /v1/simulate`);
        console.log(`  POST /v1/explain`);
        console.log(`  GET  /v1/report`);
        console.log(`  POST /v1/context/compress`);
        console.log(`  POST /v1/policy/evaluate`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    try {
      // Route matching
      if (method === 'GET' && url === '/health') {
        this.handleHealth(res);
      } else if (method === 'GET' && (url === '/' || url === '/dashboard')) {
        this.handleDashboard(res);
      } else if (method === 'GET' && url === '/v1/inventory') {
        this.handleInventory(res);
      } else if (method === 'POST' && url === '/v1/route') {
        await this.handleRoute(req, res);
      } else if (method === 'POST' && url === '/v1/simulate') {
        await this.handleSimulate(req, res);
      } else if (method === 'POST' && url === '/v1/explain') {
        await this.handleExplain(req, res);
      } else if (method === 'GET' && url === '/v1/report') {
        this.handleReport(res);
      } else if (method === 'POST' && url === '/v1/context/compress') {
        this.handleContextCompress(req, res);
      } else if (method === 'POST' && url === '/v1/policy/evaluate') {
        this.handlePolicyEvaluate(req, res);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err) }));
    }
  }

  private handleHealth(res: http.ServerResponse): void {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      version: '0.1.0',
      uptime: process.uptime(),
    }));
  }

  private handleDashboard(res: http.ServerResponse): void {
    const html = dashboardHtml(this.mozart);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  private handleInventory(res: http.ServerResponse): void {
    const snapshot = this.mozart.getInventory();
    res.writeHead(200);
    res.end(JSON.stringify(snapshot));
  }

  private async handleRoute(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readBody(req);
    const request: MozartRequest = {
      input: String(body.task ?? body.input ?? ''),
      context: Array.isArray(body.context) ? body.context as string[] : undefined,
      taskHint: typeof body.task_hint === 'string' ? body.task_hint : undefined,
      profile: typeof body.profile === 'string' ? body.profile : undefined,
      budgetMode: (body.budget_mode ?? body.budget) as MozartRequest['budgetMode'],
      privacyMode: (body.privacy_mode ?? body.privacy) as MozartRequest['privacyMode'],
      executionMode: (body.execution_mode ?? 'recommend') as MozartRequest['executionMode'],
    };

    const response = await this.mozart.process(request);
    res.writeHead(200);
    res.end(JSON.stringify({
      selected_gateway: response.route.selectedGateway,
      selected_provider: response.route.selectedProvider,
      selected_model: response.route.selectedModel,
      score: response.route.score,
      confidence: response.route.confidence,
      context_strategy: response.route.contextStrategy,
      estimated_cost: response.route.estimatedCost,
      estimated_tokens: response.tokens,
      fallbacks: response.fallbacks.map((f) => ({
        provider: f.selectedProvider,
        model: f.selectedModel,
        confidence: f.confidence,
        cost: f.estimatedCost,
      })),
      privacy: {
        allowed: response.privacy.allowed,
        action: response.privacy.action,
        findings_count: response.privacy.findings.length,
      },
      explanation: response.explanation,
    }));
  }

  private async handleSimulate(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readBody(req);
    const input = String(body.task ?? body.input ?? '');
    const route = await this.mozart.simulate(input, typeof body.task_hint === 'string' ? body.task_hint : undefined);

    res.writeHead(200);
    res.end(JSON.stringify({
      selected_gateway: route.selectedGateway,
      selected_provider: route.selectedProvider,
      selected_model: route.selectedModel,
      confidence: route.confidence,
      estimated_cost: route.estimatedCost,
      fallbacks: route.fallbacks.map((f) => ({
        provider: f.selectedProvider,
        model: f.selectedModel,
      })),
      explanation: route.explanation,
    }));
  }

  private async handleExplain(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readBody(req);
    const input = String(body.task ?? body.input ?? '');

    if (input) {
      await this.mozart.simulate(input);
    }

    const explanation = this.mozart.explainLastRoute();
    res.writeHead(200);
    res.end(JSON.stringify({ explanation }));
  }

  private handleReport(res: http.ServerResponse): void {
    const report = this.mozart.generateReport();
    const snapshot = this.mozart.getInventory();
    res.writeHead(200);
    res.end(JSON.stringify({
      report,
      session: {
        gateways: snapshot.gateways.filter((g) => g.detected).length,
        providers: snapshot.providers.length,
        models: snapshot.models.length,
      },
    }));
  }

  private async handleContextCompress(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readBody(req);
    const content = String(body.content ?? body.input ?? '');
    const contextArray = Array.isArray(body.context) ? body.context as string[] : [];
    const strategy = this.mozart.contextOptimizer.optimize(content, contextArray, {
      taskType: 'chat',
      complexity: 'low',
      contextNeed: body.max_tokens ? 'very_high' : 'low',
      privacyNeed: 'low',
      latencyPreference: 'balanced',
      costPreference: 'balanced',
      requiresTools: false,
      requiresJson: false,
      requiresLongContext: false,
      requiresCodeStrength: false,
      requiresVision: false,
      requiresReasoning: false,
    });

    res.writeHead(200);
    res.end(JSON.stringify({
      strategy: strategy.action,
      estimated_input_tokens: strategy.estimatedInputTokens,
      max_tokens: strategy.maxTokens,
      compression_ratio: strategy.compressionRatio,
      instructions: strategy.instructions,
    }));
  }

  private async handlePolicyEvaluate(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readBody(req);
    const taskStr = String(body.task ?? body.input ?? '');

    const taskProfile = this.mozart.classifier.classify(taskStr);
    const privacyResult = this.mozart.privacyGuard.evaluate(taskStr);

    const policyEval = this.mozart.policy.evaluate(
      taskProfile,
      privacyResult,
      (body.budget_mode as BudgetMode) ?? 'balanced',
      (body.privacy_mode as PrivacyMode) ?? 'balanced',
    );

    res.writeHead(200);
    res.end(JSON.stringify({
      task_type: taskProfile.taskType,
      complexity: taskProfile.complexity,
      policy_evaluation: policyEval,
      privacy_findings: privacyResult.findings.length,
      privacy_action: privacyResult.action,
    }));
  }
}

async function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

export async function startApiServer(mozart: Mozart, options?: ApiServerOptions): Promise<MozartApiServer> {
  const server = new MozartApiServer(mozart, options);
  await server.start();
  return server;
}
