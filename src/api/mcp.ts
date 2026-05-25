import { Mozart } from '../core/mozart';

// MCP (Model Context Protocol) server for Mozart.
// Exposes Mozart's routing and orchestration as MCP tools.
// Compatible with Claude Desktop, Cursor, Continue.dev, etc.

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

export class MozartMcpServer {
  private mozart: Mozart;

  constructor(mozart: Mozart) {
    this.mozart = mozart;
  }

  getTools(): McpToolDefinition[] {
    return [
      {
        name: 'mozart_route_model',
        description: 'Choose the best available model/provider/gateway for a task based on cost, context, latency, and privacy.',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'The task to route' },
            privacy_mode: { type: 'string', enum: ['open', 'balanced', 'privacy_first', 'local_only'] },
            budget_mode: { type: 'string', enum: ['lowest', 'balanced', 'quality'] },
          },
          required: ['task'],
        },
      },
      {
        name: 'mozart_estimate_cost',
        description: 'Estimate the tokens and cost for a task before execution.',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'Task description' },
            context: { type: 'string', description: 'Context to include' },
          },
          required: ['task'],
        },
      },
      {
        name: 'mozart_privacy_check',
        description: 'Scan content for secrets and sensitive data before sending to models.',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Content to scan' },
          },
          required: ['content'],
        },
      },
      {
        name: 'mozart_inventory',
        description: 'List all detected gateways, providers, and models.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'mozart_compress_context',
        description: 'Optimize and compress context to reduce token usage.',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Content to compress' },
            max_tokens: { type: 'number', description: 'Maximum tokens' },
          },
          required: ['content'],
        },
      },
      {
        name: 'mozart_report',
        description: 'Get the current session report with routing stats and cost estimates.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async handleRequest(request: McpRequest): Promise<McpResponse> {
    const { id, method, params } = request;
    const safeId = id ?? 0;

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0', id: safeId,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: { name: 'mozart-router', version: '0.1.0' },
              capabilities: { tools: {} },
            },
          };

        case 'notifications/initialized':
          return { jsonrpc: '2.0', id: safeId, result: {} };

        case 'tools/list':
          return {
            jsonrpc: '2.0', id: safeId,
            result: { tools: this.getTools() },
          };

        case 'tools/call': {
          const toolName = params?.name as string;
          const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;

          if (!toolName) {
            return { jsonrpc: '2.0', id: safeId, error: { code: -32602, message: 'Missing tool name' } };
          }

          let result: unknown;

          switch (toolName) {
            case 'mozart_route_model': {
              const task = toolArgs.task as string;
              if (!task) return { jsonrpc: '2.0', id: safeId, error: { code: -32602, message: 'Missing required parameter: task' } };
              const route = await this.mozart.recommend(task);
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    selected_gateway: route.selectedGateway,
                    selected_provider: route.selectedProvider,
                    selected_model: route.selectedModel,
                    confidence: route.confidence,
                    estimated_cost: route.estimatedCost,
                    explanation: route.explanation,
                    fallbacks: route.fallbacks.map((f) => f.selectedModel),
                  }, null, 2),
                }],
              };
              break;
            }

            case 'mozart_estimate_cost': {
              const task = toolArgs.task as string;
              if (!task) return { jsonrpc: '2.0', id: safeId, error: { code: -32602, message: 'Missing required parameter: task' } };
              const route = await this.mozart.route(task);
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    estimated_tokens: route.estimatedTokens,
                    estimated_cost: route.estimatedCost,
                    selected_model: route.selectedModel,
                  }, null, 2),
                }],
              };
              break;
            }

            case 'mozart_privacy_check': {
              const content = toolArgs.content as string;
              if (!content) return { jsonrpc: '2.0', id: safeId, error: { code: -32602, message: 'Missing required parameter: content' } };
              const check = this.mozart.privacyGuard.evaluate(content);
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    allowed: check.allowed,
                    action: check.action,
                    findings_count: check.findings.length,
                    findings: check.findings.map((f) => ({ type: f.type, severity: f.severity, action: f.action })),
                  }, null, 2),
                }],
              };
              break;
            }

            case 'mozart_inventory': {
              const snapshot = this.mozart.getInventory();
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    gateways: snapshot.gateways.filter((g) => g.detected).map((g) => g.gatewayName),
                    providers_count: snapshot.providers.length,
                    models_count: snapshot.models.length,
                    local_models: snapshot.models.filter((m) => m.privacyLevel === 'local').length,
                    cloud_models: snapshot.models.filter((m) => m.privacyLevel === 'cloud').length,
                  }, null, 2),
                }],
              };
              break;
            }

            case 'mozart_compress_context': {
              const content = toolArgs.content as string;
              if (!content) return { jsonrpc: '2.0', id: safeId, error: { code: -32602, message: 'Missing required parameter: content' } };
              const strategy = this.mozart.contextOptimizer.optimize(
                toolArgs.content as string,
                [],
                {
                  taskType: 'chat', complexity: 'low', contextNeed: 'low', privacyNeed: 'low',
                  latencyPreference: 'balanced', costPreference: 'balanced',
                  requiresTools: false, requiresJson: false, requiresLongContext: false,
                  requiresCodeStrength: false, requiresVision: false, requiresReasoning: false,
                },
              );
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    strategy: strategy.action,
                    estimated_input_tokens: strategy.estimatedInputTokens,
                    max_tokens: strategy.maxTokens,
                  }, null, 2),
                }],
              };
              break;
            }

            case 'mozart_report': {
              result = {
                content: [{
                  type: 'text',
                  text: this.mozart.generateReport(),
                }],
              };
              break;
            }

            default:
              return {
                jsonrpc: '2.0', id: safeId,
                error: { code: -32601, message: `Unknown tool: ${toolName}` },
              };
          }

          return { jsonrpc: '2.0', id: safeId, result };

        }

        default:
          return {
            jsonrpc: '2.0', id: safeId,
            error: { code: -32601, message: `Unknown method: ${method}` },
          };
      }
    } catch (err) {
      return {
        jsonrpc: '2.0', id: safeId,
        error: { code: -32000, message: String(err) },
      };
    }
  }
}
