import { RouteDecision, CostEstimate, TokenUsage } from '../types';

export interface MetricsSnapshot {
  timestamp: string;
  routes: {
    total: number;
    byTaskType: Record<string, number>;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
  };
  costs: {
    totalEstimated: number;
    totalSaved: number;
    averagePerCall: number;
  };
  tokens: {
    totalInput: number;
    totalOutput: number;
    total: number;
  };
  privacy: {
    checks: number;
    blocks: number;
    filesKeptLocal: number;
  };
  gateways: {
    active: number;
    total: number;
  };
}

export class MetricsCollector {
  private routes: RouteDecision[] = [];
  private costEstimates: CostEstimate[] = [];
  private tokenUsages: TokenUsage[] = [];
  private privacyBlocks = 0;
  private privacyChecks = 0;
  private filesKeptLocal = 0;
  private startTime = Date.now();

  recordRoute(route: RouteDecision): void {
    this.routes.push(route);
  }

  recordCost(cost: CostEstimate): void {
    this.costEstimates.push(cost);
  }

  recordTokens(tokens: TokenUsage): void {
    this.tokenUsages.push(tokens);
  }

  recordPrivacyCheck(blocked: boolean): void {
    this.privacyChecks++;
    if (blocked) this.privacyBlocks++;
  }

  recordFileKeptLocal(): void {
    this.filesKeptLocal++;
  }

  snapshot(activeGateways: number, totalGateways: number): MetricsSnapshot {
    const taskTypeCounts: Record<string, number> = {};
    const providerCounts: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};

    for (const r of this.routes) {
      const tt = r.explanation[0]?.split(':')[0]?.replace('Task', '').trim() ?? 'unknown';
      taskTypeCounts[tt] = (taskTypeCounts[tt] ?? 0) + 1;
      providerCounts[r.selectedProvider] = (providerCounts[r.selectedProvider] ?? 0) + 1;
      modelCounts[r.selectedModel] = (modelCounts[r.selectedModel] ?? 0) + 1;
    }

    const totalCost = this.costEstimates.reduce((s, c) => s + c.totalCost, 0);
    const totalSaved = this.costEstimates.reduce((s, c) => s + (c.comparedToPremium && c.totalCost < c.comparedToPremium ? c.comparedToPremium - c.totalCost : 0), 0);
    const totalInput = this.tokenUsages.reduce((s, t) => s + t.input, 0);
    const totalOutput = this.tokenUsages.reduce((s, t) => s + t.output, 0);

    return {
      timestamp: new Date().toISOString(),
      routes: {
        total: this.routes.length,
        byTaskType: taskTypeCounts,
        byProvider: providerCounts,
        byModel: modelCounts,
      },
      costs: {
        totalEstimated: Math.round(totalCost * 10000) / 10000,
        totalSaved: Math.round(totalSaved * 10000) / 10000,
        averagePerCall: this.costEstimates.length > 0 ? Math.round((totalCost / this.costEstimates.length) * 10000) / 10000 : 0,
      },
      tokens: {
        totalInput,
        totalOutput,
        total: totalInput + totalOutput,
      },
      privacy: {
        checks: this.privacyChecks,
        blocks: this.privacyBlocks,
        filesKeptLocal: this.filesKeptLocal,
      },
      gateways: {
        active: activeGateways,
        total: totalGateways,
      },
    };
  }

  toPrometheus(): string {
    const snapshot = this.snapshot(0, 0);
    const lines: string[] = [
      `# HELP mozart_routes_total Total routes processed`,
      `# TYPE mozart_routes_total counter`,
      `mozart_routes_total ${snapshot.routes.total}`,
      ``,
      `# HELP mozart_cost_estimated_total Estimated cost in USD`,
      `# TYPE mozart_cost_estimated_total gauge`,
      `mozart_cost_estimated_total ${snapshot.costs.totalEstimated}`,
      ``,
      `# HELP mozart_cost_saved_total Estimated savings in USD`,
      `# TYPE mozart_cost_saved_total gauge`,
      `mozart_cost_saved_total ${snapshot.costs.totalSaved}`,
      ``,
      `# HELP mozart_tokens_input_total Total input tokens`,
      `# TYPE mozart_tokens_input_total counter`,
      `mozart_tokens_input_total ${snapshot.tokens.totalInput}`,
      ``,
      `# HELP mozart_tokens_output_total Total output tokens`,
      `# TYPE mozart_tokens_output_total counter`,
      `mozart_tokens_output_total ${snapshot.tokens.totalOutput}`,
      ``,
      `# HELP mozart_privacy_blocks_total Total privacy blocks`,
      `# TYPE mozart_privacy_blocks_total counter`,
      `mozart_privacy_blocks_total ${snapshot.privacy.blocks}`,
    ];
    return lines.join('\n');
  }

  toJSON(): MetricsSnapshot {
    return this.snapshot(0, 0);
  }

  reset(): void {
    this.routes = [];
    this.costEstimates = [];
    this.tokenUsages = [];
    this.privacyBlocks = 0;
    this.privacyChecks = 0;
    this.filesKeptLocal = 0;
    this.startTime = Date.now();
  }
}
