import { PolicyConfig, DEFAULT_POLICY } from '../types';

export interface ProfileDefinition {
  name: string;
  description: string;
  policy: Partial<PolicyConfig>;
}

export const BUILTIN_PROFILES: ProfileDefinition[] = [
  {
    name: 'coding-agent',
    description: 'Optimized for coding agents: quality code models, local fallback for simple tasks',
    policy: {
      mode: 'coding-agent',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'balanced',
        envFiles: 'block_cloud',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'quality',
        dailyLimitUsd: 10,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: false,
        premiumForCritical: true,
        allowCloudForCode: true,
        preferLocalForSimpleTasks: true,
      },
    },
  },
  {
    name: 'cheap-loops',
    description: 'Minimize costs for agent loops and repeated calls',
    policy: {
      mode: 'cheap-loops',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'balanced',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'lowest',
        dailyLimitUsd: 2,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: true,
        premiumForCritical: false,
        preferLocalForSimpleTasks: true,
        allowCloudForCode: true,
      },
    },
  },
  {
    name: 'privacy-first',
    description: 'Maximum privacy: local-only by default, cloud only with explicit approval',
    policy: {
      mode: 'privacy-first',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'local_only',
        secrets: 'local_only',
        envFiles: 'block_cloud',
        customerData: 'local_only',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'balanced',
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: true,
        premiumForCritical: true,
        allowCloudForCode: false,
        allowCloudForSensitiveFiles: false,
        preferLocalForSimpleTasks: true,
      },
    },
  },
  {
    name: 'long-context',
    description: 'Optimized for long-context tasks with large context windows',
    policy: {
      mode: 'long-context',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'balanced',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'quality',
        dailyLimitUsd: 20,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: false,
        premiumForCritical: true,
        allowCloudForCode: true,
      },
    },
  },
  {
    name: 'startup-budget',
    description: 'Tight budget profile for startups: cheap models for everything, premium only when critical',
    policy: {
      mode: 'startup-budget',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'balanced',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'lowest',
        dailyLimitUsd: 3,
        warnAtPercent: 75,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: true,
        premiumForCritical: true,
        preferLocalForSimpleTasks: true,
        allowCloudForCode: true,
      },
    },
  },
  {
    name: 'max-quality',
    description: 'Maximum quality regardless of cost',
    policy: {
      mode: 'max-quality',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'balanced',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'quality',
        dailyLimitUsd: 50,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: false,
        premiumForCritical: true,
        allowCloudForCode: true,
        preferLocalForSimpleTasks: false,
      },
    },
  },
  {
    name: 'local-first',
    description: 'Prefer local models, only use cloud when necessary',
    policy: {
      mode: 'local-first',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'privacy_first',
        secrets: 'local_only',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'lowest',
        dailyLimitUsd: 2,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: true,
        premiumForCritical: false,
        allowCloudForCode: false,
        allowCloudForSensitiveFiles: false,
        preferLocalForSimpleTasks: true,
      },
    },
  },
  {
    name: 'research-agent',
    description: 'For research tasks: long context, quality models, higher budget',
    policy: {
      mode: 'research-agent',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'balanced',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'quality',
        dailyLimitUsd: 15,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: false,
        premiumForCritical: true,
        allowCloudForCode: true,
        preferLocalForSimpleTasks: false,
      },
    },
  },
  {
    name: 'reviewer-agent',
    description: 'For code review tasks: quality models, privacy-aware',
    policy: {
      mode: 'reviewer-agent',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'privacy_first',
        envFiles: 'block_cloud',
        customerData: 'trusted_only',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'balanced',
        dailyLimitUsd: 8,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: false,
        premiumForCritical: true,
        allowCloudForCode: true,
        allowCloudForSensitiveFiles: false,
        preferLocalForSimpleTasks: false,
      },
    },
  },
  {
    name: 'multi-agent',
    description: 'For multi-agent orchestrations: cost-aware, reliable fallbacks',
    policy: {
      mode: 'multi-agent',
      privacy: {
        ...DEFAULT_POLICY.privacy,
        mode: 'balanced',
      },
      budget: {
        ...DEFAULT_POLICY.budget,
        mode: 'lowest',
        dailyLimitUsd: 10,
      },
      routing: {
        ...DEFAULT_POLICY.routing,
        cheapFirst: true,
        premiumForCritical: true,
        allowCloudForCode: true,
        preferLocalForSimpleTasks: true,
        fallback: true,
        maxRetries: 3,
      },
    },
  },
];

export function getProfile(name: string): ProfileDefinition | undefined {
  return BUILTIN_PROFILES.find((p) => p.name === name);
}

export function listProfiles(): ProfileDefinition[] {
  return BUILTIN_PROFILES;
}

export function applyProfile(policy: PolicyConfig, profileName: string): PolicyConfig {
  const profile = getProfile(profileName);
  if (!profile) return policy;
  return { ...policy, ...profile.policy };
}
