import { PolicyConfig, DEFAULT_POLICY } from '../types';

export function loadPolicyFromEnv(): Partial<PolicyConfig> {
  const partial: Partial<PolicyConfig> = {};

  if (process.env.MOZART_PRIVACY_MODE) {
    partial.privacy = {
      ...DEFAULT_POLICY.privacy,
      mode: process.env.MOZART_PRIVACY_MODE as 'open' | 'balanced' | 'privacy_first' | 'local_only',
    };
  }

  if (process.env.MOZART_BUDGET_MODE) {
    partial.budget = {
      ...DEFAULT_POLICY.budget,
      mode: process.env.MOZART_BUDGET_MODE as 'lowest' | 'balanced' | 'quality',
    };
  }

  if (process.env.MOZART_DAILY_LIMIT_USD) {
    partial.budget = {
      ...(partial.budget ?? DEFAULT_POLICY.budget),
      dailyLimitUsd: parseFloat(process.env.MOZART_DAILY_LIMIT_USD),
    };
  }

  return partial;
}
