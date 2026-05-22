import {
  MozartRequest,
  MozartResponse,
  RouteDecision,
  CostEstimate,
  TokenUsage,
  PrivacyDecision,
  PolicyConfig,
  DEFAULT_POLICY,
  ExecutionMode,
  InventorySnapshot,
} from '../types';
import { InventoryRegistry } from './inventory';
import { SessionTracker } from './session';
import { TaskClassifier } from '../routing/classifier';
import { RoutingEngine } from '../routing/router';
import { PolicyEngine } from '../policy/engine';
import { PrivacyGuard } from '../privacy/guard';
import { ContextOptimizer } from '../context/optimizer';
import { CostEstimator } from '../cost/estimator';
import { ExplainabilityEngine } from '../explain/engine';
import { Logger } from '../logs/logger';

export interface MozartConfig {
  policy?: Partial<PolicyConfig>;
  registry?: InventoryRegistry;
  logger?: Logger;
}

export class Mozart {
  public registry: InventoryRegistry;
  public policy: PolicyEngine;
  public classifier: TaskClassifier;
  public router: RoutingEngine;
  public privacyGuard: PrivacyGuard;
  public contextOptimizer: ContextOptimizer;
  public costEstimator: CostEstimator;
  public explainer: ExplainabilityEngine;
  public logger: Logger;
  public session: SessionTracker;

  constructor(config?: MozartConfig) {
    this.registry = config?.registry ?? new InventoryRegistry();
    const policyConfig = { ...DEFAULT_POLICY, ...config?.policy };
    this.policy = new PolicyEngine(policyConfig);
    this.logger = config?.logger ?? new Logger(policyConfig.logs);
    this.classifier = new TaskClassifier();
    this.privacyGuard = new PrivacyGuard(this.logger);
    this.contextOptimizer = new ContextOptimizer();
    this.costEstimator = new CostEstimator();
    this.router = new RoutingEngine(
      this.registry,
      this.policy,
      this.costEstimator,
    );
    this.explainer = new ExplainabilityEngine();
    this.session = new SessionTracker();
  }

  async process(request: MozartRequest): Promise<MozartResponse> {
    const mode: ExecutionMode = request.executionMode ?? 'recommend';

    const taskProfile = this.classifier.classify(
      request.input,
      request.taskHint,
    );

    const privacyResult = this.privacyGuard.evaluate(request.input);
    if (request.context?.length) {
      for (const ctx of request.context) {
        this.privacyGuard.evaluate(ctx);
      }
    }

    this.logger.logRoutingDecision(taskProfile.taskType, request.input.slice(0, 100));

    const policyEval = this.policy.evaluate(
      taskProfile,
      privacyResult,
      request.budgetMode ?? this.policy.config.budget.mode,
      request.privacyMode ?? this.policy.config.privacy.mode,
    );

    const contextStrategy = this.contextOptimizer.optimize(
      request.input,
      request.context ?? [],
      taskProfile,
    );

    const route = this.router.route(
      taskProfile,
      privacyResult,
      policyEval,
      contextStrategy,
    );

    const cost = this.costEstimator.estimate(route, contextStrategy);
    const tokens: TokenUsage = {
      input: contextStrategy.estimatedInputTokens,
      output: Math.ceil(contextStrategy.estimatedInputTokens * 0.3),
      total: 0,
    };
    tokens.total = tokens.input + tokens.output;

    this.session.recordRoute(route);

    let output: string | undefined;
    if (mode === 'execute' || mode === 'delegate') {
      output = await this.delegate(route, request);
    }

    const explanation = this.explainer.explain(route, taskProfile, cost, privacyResult);

    return {
      output,
      route,
      cost,
      tokens,
      privacy: privacyResult,
      fallbacks: route.fallbacks,
      explanation,
      logsRef: this.logger.getLastLogRef(),
    };
  }

  async simulate(input: string, taskHint?: string): Promise<RouteDecision> {
    const taskProfile = this.classifier.classify(input, taskHint);
    const privacyResult = this.privacyGuard.evaluate(input);
    const policyEval = this.policy.evaluate(
      taskProfile,
      privacyResult,
      'balanced',
      'balanced',
    );
    const contextStrategy = this.contextOptimizer.optimize(input, [], taskProfile);
    const route = this.router.route(taskProfile, privacyResult, policyEval, contextStrategy);
    this.session.recordRoute(route);
    return route;
  }

  async route(input: string): Promise<RouteDecision> {
    const taskProfile = this.classifier.classify(input);
    const privacyResult = this.privacyGuard.evaluate(input);
    const policyEval = this.policy.evaluate(
      taskProfile,
      privacyResult,
      'balanced',
      'balanced',
    );
    const contextStrategy = this.contextOptimizer.optimize(input, [], taskProfile);
    const route = this.router.route(taskProfile, privacyResult, policyEval, contextStrategy);
    this.session.recordRoute(route);
    return route;
  }

  async recommend(input: string): Promise<RouteDecision> {
    return this.route(input);
  }

  async delegate(route: RouteDecision, request: MozartRequest): Promise<string> {
    this.logger.logEvent('delegation', `Delegating to ${route.selectedGateway ?? 'direct'} -> ${route.selectedProvider}/${route.selectedModel}`);

    if (this.registry.hasAdapter(route.selectedGateway)) {
      const adapter = this.registry.getAdapter(route.selectedGateway!);
      if (adapter?.execute) {
        const target = adapter.getExecutionTarget
          ? await adapter.getExecutionTarget(route)
          : undefined;
        const execReq = {
          input: request.input,
          context: request.context,
          model: route.selectedModel,
          provider: route.selectedProvider,
          gateway: route.selectedGateway,
          executionTarget: target ?? {
            adapter: adapter.id,
            provider: route.selectedProvider,
            model: route.selectedModel,
            apiKeyManagedBy: 'gateway',
            method: 'gateway_call',
          },
        };
        const result = await adapter.execute(execReq);
        this.logger.logEvent('execution', `Result from ${route.selectedModel}: success=${result.success}`);
        return result.output ?? `[Execution delegated to ${route.selectedGateway}]}`;
      }
    }

    return `[Recommendation only] Route: ${route.selectedGateway ?? 'direct'} / ${route.selectedProvider} / ${route.selectedModel}`;
  }

  getInventory(): InventorySnapshot {
    return this.registry.snapshot();
  }

  generateReport(): string {
    return this.session.generateReport();
  }

  explainLastRoute(): string {
    return this.session.explainLast();
  }
}
