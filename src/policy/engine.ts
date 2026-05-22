import { PolicyConfig, DEFAULT_POLICY, TaskProfile, PrivacyDecision, BudgetMode, PrivacyMode } from '../types';
import { PolicyEvalResult } from '../routing/router';

export class PolicyEngine {
  public config: PolicyConfig;

  constructor(config?: Partial<PolicyConfig>) {
    this.config = { ...DEFAULT_POLICY, ...config };
  }

  evaluate(
    task: TaskProfile,
    privacy: PrivacyDecision,
    budgetMode: BudgetMode = 'balanced',
    privacyMode: PrivacyMode = 'balanced',
  ): PolicyEvalResult {
    const blockedProviders: string[] = [];
    const allowedProviders: string[] = [];
    let requireLocal = false;
    let allowCloud = true;
    let maxCost = this.config.budget.dailyLimitUsd;

    // Privacy constraints
    if (this.config.privacy.mode === 'local_only' || privacyMode === 'local_only') {
      requireLocal = true;
      allowCloud = false;
    }

    if (privacy.action === 'local_only') {
      requireLocal = true;
      allowCloud = false;
    }

    if (privacy.action === 'block_cloud') {
      allowCloud = false;
    }

    // Budget mode adjustments
    const preferCheap = this.config.routing.cheapFirst || budgetMode === 'lowest';

    // Task-specific rules
    const isSimpleTask = task.complexity === 'low';
    if (isSimpleTask && this.config.routing.preferLocalForSimpleTasks) {
      // Prefer local, but don't require it unless privacy demands
    }

    if (task.taskType === 'code_generation' && !this.config.routing.allowCloudForCode) {
      allowCloud = false;
    }

    if (task.privacyNeed === 'high' && !this.config.routing.allowCloudForSensitiveFiles) {
      allowCloud = false;
    }

    return {
      allowedProviders,
      blockedProviders,
      requireLocal,
      preferCheap,
      allowCloud,
      maxCost,
    };
  }

  toJSON(): PolicyConfig {
    return { ...this.config };
  }
}
