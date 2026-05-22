// Mozart — Local orchestration and routing for AI agents
// Gateway-first, agent-first, integration-first

export { Mozart } from './core/mozart';
export type { MozartConfig } from './core/mozart';
export { InventoryRegistry } from './core/inventory';
export { SessionTracker } from './core/session';

export { TaskClassifier } from './routing/classifier';
export { RoutingEngine } from './routing/router';
export type { PolicyEvalResult } from './routing/router';
export { RoutingScorer } from './routing/scorer';

export { PolicyEngine } from './policy/engine';
export { loadPolicyFromEnv } from './policy/loader';
export { BUILTIN_PROFILES, getProfile, listProfiles, applyProfile } from './policy/profiles';
export type { ProfileDefinition } from './policy/profiles';
export { loadMozartConfig, generateDefaultConfig } from './policy/yaml-loader';
export type { LoadResult } from './policy/yaml-loader';

export { PrivacyGuard } from './privacy/guard';
export { ContextOptimizer } from './context/optimizer';
export { CostEstimator } from './cost/estimator';
export { ExplainabilityEngine } from './explain/engine';

export { Logger } from './logs/logger';
export type { LogEntry } from './logs/logger';
export { Redactor } from './logs/redactor';

export {
  OllamaAdapter,
  LiteLLMAdapter,
  OpenRouterAdapter,
  OpenCodeAdapter,
  OpenClawAdapter,
  HermesAdapter,
  CursorAdapter,
  LMStudioAdapter,
  VllmAdapter,
  NvidiaNimAdapter,
  GenericOpenAIAdapter,
  discoverAllGenericAdapters,
} from './adapters';
export type { GenericAdapterConfig } from './adapters';

export {
  ALL_SKILLS,
  ROUTE_MODEL_SKILL,
  EXPLAIN_ROUTE_SKILL,
  ESTIMATE_COST_SKILL,
  COMPRESS_CONTEXT_SKILL,
  PRIVACY_CHECK_SKILL,
  FALLBACK_PLAN_SKILL,
  INVENTORY_SKILL,
} from './skills';

export { MozartApiServer, startApiServer } from './api/server';
export type { ApiServerOptions } from './api/server';
export { MozartMiddleware } from './api/middleware';
export type { MiddlewareOptions } from './api/middleware';

export { ResultCache } from './core/cache';
export type { CacheEntry } from './core/cache';

export { FallbackManager } from './routing/fallback';
export type { FallbackEvent, FallbackResult } from './routing/fallback';
export { MultiStageRouter } from './routing/multistage';
export type { MultiStageStep, MultiStageResult } from './routing/multistage';

export {
  saveInventory, loadInventory,
  saveSession, loadSession,
  saveConfig, loadConfigYaml,
  getMozartDir, clearAllData,
} from './core/persistence';

export { syncDealsForgeData } from './utils/dealsforge';
export { scanLocalCapability, estimateLocalModelCapacity } from './utils/canrunit';
export type { LocalCapability } from './utils/canrunit';

export type * from './types';
