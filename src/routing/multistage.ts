import { RouteDecision, TaskProfile, ContextStrategy, CostEstimate, TokenUsage } from '../types';
import { InventoryRegistry } from '../core/inventory';
import { PolicyEngine } from '../policy/engine';
import { TaskClassifier } from '../routing/classifier';
import { RoutingEngine } from '../routing/router';
import { CostEstimator } from '../cost/estimator';
import { ContextOptimizer } from '../context/optimizer';
import { PrivacyGuard } from '../privacy/guard';

export interface MultiStageStep {
  name: string;
  description: string;
  taskType: string;
  route: RouteDecision;
  output?: string;
  cost: CostEstimate;
  tokens: TokenUsage;
}

export interface MultiStageResult {
  steps: MultiStageStep[];
  totalCost: CostEstimate;
  totalTokens: TokenUsage;
  elapsedMs: number;
  success: boolean;
  error?: string;
}

export class MultiStageRouter {
  constructor(
    private registry: InventoryRegistry,
    private policy: PolicyEngine,
    private classifier: TaskClassifier,
    private router: RoutingEngine,
    private costEstimator: CostEstimator,
    private contextOptimizer: ContextOptimizer,
    private privacyGuard: PrivacyGuard,
  ) {}

  defineStages(task: string): Array<{ name: string; taskHint: string; description: string }> {
    const profile = this.classifier.classify(task);

    // Simple tasks get single stage
    if (profile.complexity === 'low') {
      return [{ name: 'generate', taskHint: task, description: 'Generate response' }];
    }

    // Complex tasks get multi-stage pipeline
    if (profile.taskType === 'code_generation' || profile.taskType === 'refactor') {
      return [
        { name: 'analyze', taskHint: `Analyze the requirements: ${task}`, description: 'Analyze and plan approach' },
        { name: 'generate', taskHint: `Implement based on the plan: ${task}`, description: 'Generate implementation' },
        { name: 'review', taskHint: `Review and validate: ${task}`, description: 'Review and validate output' },
      ];
    }

    if (profile.taskType === 'debugging') {
      return [
        { name: 'classify', taskHint: `Classify this error: ${task}`, description: 'Classify and isolate the error' },
        { name: 'analyze', taskHint: `Find root cause: ${task}`, description: 'Identify root cause' },
        { name: 'fix', taskHint: `Generate fix for: ${task}`, description: 'Generate and apply fix' },
        { name: 'verify', taskHint: `Verify the fix: ${task}`, description: 'Verify the fix works' },
      ];
    }

    if (profile.taskType === 'security_audit') {
      return [
        { name: 'scan', taskHint: `Scan for vulnerabilities: ${task}`, description: 'Scan for vulnerabilities' },
        { name: 'analyze', taskHint: `Analyze vulnerability severity: ${task}`, description: 'Analyze severity and impact' },
        { name: 'recommend', taskHint: `Recommend fixes: ${task}`, description: 'Generate remediation recommendations' },
      ];
    }

    return [
      { name: 'analyze', taskHint: `Analyze: ${task}`, description: 'Analyze the request' },
      { name: 'generate', taskHint: `Generate: ${task}`, description: 'Generate the response' },
    ];
  }

  async execute(
    task: string,
    executor: (step: { name: string; taskHint: string }, route: RouteDecision) => Promise<{ output: string; cost: CostEstimate; tokens: TokenUsage }>,
  ): Promise<MultiStageResult> {
    const start = Date.now();
    const stages = this.defineStages(task);
    const steps: MultiStageStep[] = [];
    let totalInputCost = 0;
    let totalOutputCost = 0;
    let totalInput = 0;
    let totalOutput = 0;

    let accumulatedContext = '';

    for (const stage of stages) {
      const taskProfile = this.classifier.classify(stage.taskHint);
      const privacyResult = this.privacyGuard.evaluate(stage.taskHint + accumulatedContext);
      const policyEval = this.policy.evaluate(taskProfile, privacyResult, 'balanced', 'balanced');
      const contextStrategy = this.contextOptimizer.optimize(stage.taskHint, accumulatedContext ? [accumulatedContext] : [], taskProfile);
      const route = this.router.route(taskProfile, privacyResult, policyEval, contextStrategy);

      try {
        const result = await executor(stage, route);
        totalInputCost += result.cost.inputCost;
        totalOutputCost += result.cost.outputCost;
        totalInput += result.tokens.input;
        totalOutput += result.tokens.output;
        accumulatedContext += '\n' + result.output;

        steps.push({
          name: stage.name,
          description: stage.description,
          taskType: taskProfile.taskType,
          route,
          output: result.output,
          cost: result.cost,
          tokens: result.tokens,
        });
      } catch (err) {
        return {
          steps,
          totalCost: { inputCost: totalInputCost, outputCost: totalOutputCost, totalCost: totalInputCost + totalOutputCost, currency: 'USD' },
          totalTokens: { input: totalInput, output: totalOutput, total: totalInput + totalOutput },
          elapsedMs: Date.now() - start,
          success: false,
          error: `Stage "${stage.name}" failed: ${err}`,
        };
      }
    }

    return {
      steps,
      totalCost: { inputCost: totalInputCost, outputCost: totalOutputCost, totalCost: totalInputCost + totalOutputCost, currency: 'USD' },
      totalTokens: { input: totalInput, output: totalOutput, total: totalInput + totalOutput },
      elapsedMs: Date.now() - start,
      success: true,
    };
  }
}
