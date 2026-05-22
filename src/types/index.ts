// ─── Provider ──────────────────────────────────────────────
export type ProviderSource = 'detected' | 'manual' | 'dealsforge' | 'gateway';
export type PrivacyLevel = 'local' | 'cloud' | 'unknown';
export type AvailabilityStatus = 'available' | 'limited' | 'unavailable' | 'unknown';

export interface Provider {
  id: string;
  name: string;
  source: ProviderSource;
  gateway?: string;
  baseUrl?: string;
  apiKeyRef?: string;
  supportsModelsEndpoint?: boolean;
  supportsStreaming?: boolean;
  supportsTools?: boolean | 'unknown';
  supportsJsonMode?: boolean | 'unknown';
  supportsVision?: boolean | 'unknown';
  supportsEmbeddings?: boolean | 'unknown';
  supportsAudio?: boolean | 'unknown';
  supportsBatch?: boolean | 'unknown';
  pricingKnown?: boolean;
  privacyLevel: PrivacyLevel;
  status: AvailabilityStatus;
  lastCheckedAt: string;
}

// ─── Model ─────────────────────────────────────────────────
export type Modality = 'text' | 'vision' | 'audio' | 'image' | 'embedding' | 'rerank' | 'multimodal';
export type LatencyClass = 'fast' | 'medium' | 'slow' | 'unknown';
export type QualityClass = 'low' | 'medium' | 'high' | 'premium' | 'unknown';
export type SourceConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface Model {
  id: string;
  providerId: string;
  gatewayId?: string;
  displayName: string;
  family?: string;
  modality: Modality[];
  contextWindow?: number;
  inputPrice?: number;
  outputPrice?: number;
  currency?: 'USD' | 'EUR' | 'unknown';
  latencyClass: LatencyClass;
  qualityClass: QualityClass;
  strengths: string[];
  weaknesses: string[];
  supportsTools?: boolean | 'unknown';
  supportsJsonMode?: boolean | 'unknown';
  supportsStructuredOutputs?: boolean | 'unknown';
  privacyLevel: PrivacyLevel;
  availability: AvailabilityStatus;
  sourceConfidence: SourceConfidence;
  lastCheckedAt: string;
}

// ─── Task Classification ───────────────────────────────────
export type TaskType =
  | 'chat'
  | 'summarize'
  | 'translate'
  | 'extract'
  | 'code_generation'
  | 'code_review'
  | 'refactor'
  | 'debugging'
  | 'test_writing'
  | 'security_audit'
  | 'architecture'
  | 'web_research'
  | 'data_analysis'
  | 'planning'
  | 'creative_writing'
  | 'long_context_reasoning'
  | 'file_editing'
  | 'agent_loop'
  | 'formatting';

export type Complexity = 'low' | 'medium' | 'high' | 'critical';
export type ContextNeed = 'low' | 'medium' | 'high' | 'very_high';
export type PrivacyNeed = 'low' | 'medium' | 'high' | 'local_only';
export type LatencyPreference = 'fast' | 'balanced' | 'quality';
export type CostPreference = 'lowest' | 'balanced' | 'quality';

export interface TaskProfile {
  taskType: TaskType;
  complexity: Complexity;
  contextNeed: ContextNeed;
  privacyNeed: PrivacyNeed;
  latencyPreference: LatencyPreference;
  costPreference: CostPreference;
  requiresTools: boolean;
  requiresJson: boolean;
  requiresLongContext: boolean;
  requiresCodeStrength: boolean;
  requiresVision: boolean;
  requiresReasoning: boolean;
}

// ─── Routing ───────────────────────────────────────────────
export interface RoutingScore {
  modelId: string;
  providerId: string;
  gatewayId?: string;
  totalScore: number;
  qualityScore: number;
  costScore: number;
  latencyScore: number;
  privacyScore: number;
  contextScore: number;
  reliabilityScore: number;
  quotaScore: number;
  explanation: string[];
}

export interface RouteDecision {
  selectedGateway?: string;
  selectedProvider: string;
  selectedModel: string;
  score: number;
  confidence: number;
  contextStrategy: string;
  estimatedCost: number;
  estimatedTokens: TokenUsage;
  fallbacks: RouteDecision[];
  explanation: string[];
}

// ─── Policy ────────────────────────────────────────────────
export type PrivacyMode = 'open' | 'balanced' | 'privacy_first' | 'local_only';
export type BudgetMode = 'lowest' | 'balanced' | 'quality';

export interface PolicyConfig {
  mode: string;
  profile?: string;
  privacy: {
    mode: PrivacyMode;
    secrets: 'allow' | 'block_cloud' | 'local_only';
    envFiles: 'allow' | 'block_cloud' | 'local_only';
    customerData: 'allow' | 'trusted_only' | 'local_only';
  };
  budget: {
    mode: BudgetMode;
    dailyLimitUsd: number;
    warnAtPercent: number;
  };
  routing: {
    explain: boolean;
    fallback: boolean;
    cheapFirst: boolean;
    premiumForCritical: boolean;
    maxRetries: number;
    preferLocalForSimpleTasks: boolean;
    allowCloudForCode: boolean;
    allowCloudForSensitiveFiles: boolean;
  };
  logs: {
    enabled: boolean;
    redactSecrets: boolean;
    retentionDays: number;
  };
}

export const DEFAULT_POLICY: PolicyConfig = {
  mode: 'local_first',
  profile: 'startup-budget',
  privacy: {
    mode: 'balanced',
    secrets: 'local_only',
    envFiles: 'block_cloud',
    customerData: 'trusted_only',
  },
  budget: {
    mode: 'balanced',
    dailyLimitUsd: 5,
    warnAtPercent: 80,
  },
  routing: {
    explain: true,
    fallback: true,
    cheapFirst: true,
    premiumForCritical: true,
    maxRetries: 2,
    preferLocalForSimpleTasks: true,
    allowCloudForCode: true,
    allowCloudForSensitiveFiles: false,
  },
  logs: {
    enabled: true,
    redactSecrets: true,
    retentionDays: 30,
  },
};

// ─── Privacy ───────────────────────────────────────────────
export type PrivacyAction = 'allow' | 'redact' | 'block_cloud' | 'local_only' | 'require_confirmation';

export interface PrivacyFinding {
  type: 'api_key' | 'token' | 'secret' | 'env_file' | 'pii' | 'credential' | 'private_key' | 'sensitive_file';
  match: string;
  masked: string;
  position: { start: number; end: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: PrivacyAction;
  reason: string;
}

export interface PrivacyDecision {
  allowed: boolean;
  mode: PrivacyMode;
  findings: PrivacyFinding[];
  action: PrivacyAction;
  redactedContent?: string;
  explanation: string[];
}

// ─── Context Optimization ──────────────────────────────────
export interface ContextStrategy {
  action: 'send_all' | 'compress' | 'truncate' | 'summarize' | 'select_relevant';
  estimatedInputTokens: number;
  maxTokens: number;
  compressionRatio?: number;
  instructions: string[];
}

// ─── Cost & Tokens ─────────────────────────────────────────
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  savingsPercentage?: number;
  comparedToPremium?: number;
}

// ─── Execution ─────────────────────────────────────────────
export type ExecutionMode = 'recommend' | 'execute' | 'simulate' | 'delegate';

export interface ExecutionTarget {
  adapter: string;
  gateway?: string;
  provider: string;
  model: string;
  baseUrl?: string;
  requiresApiKey?: boolean;
  apiKeyManagedBy: 'gateway' | 'env' | 'manual' | 'none';
  method: 'gateway_call' | 'tool_call' | 'direct_http' | 'local_exec';
}

export interface ExecutionRequest {
  input: string;
  context?: string[];
  model: string;
  provider: string;
  gateway?: string;
  executionTarget: ExecutionTarget;
  options?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  tokens?: TokenUsage;
  cost?: CostEstimate;
  latencyMs?: number;
  error?: string;
  delegated?: boolean;
}

// ─── Gateway Adapter ───────────────────────────────────────
export interface DetectionResult {
  detected: boolean;
  gatewayId: string;
  gatewayName: string;
  configPath?: string;
  configFormat?: string;
  status: 'active' | 'inactive' | 'configured_only' | 'not_found';
  providersCount: number;
  modelsCount: number;
  details: string[];
}

export interface GatewayConfigSummary {
  gatewayId: string;
  gatewayName: string;
  configPath?: string;
  providers: string[];
  models: string[];
  capabilities: string[];
}

export interface CapabilitySummary {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsJson: boolean;
  supportsVision: boolean;
  maxConcurrency: number;
  rateLimit?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

export interface GatewayAdapter {
  id: string;
  name: string;
  detect(): Promise<DetectionResult>;
  readConfig?(): Promise<GatewayConfigSummary>;
  listProviders(): Promise<Provider[]>;
  listModels(): Promise<Model[]>;
  listCapabilities?(): Promise<CapabilitySummary>;
  getExecutionTarget?(decision: RouteDecision): Promise<ExecutionTarget>;
  testConnection?(): Promise<ConnectionStatus>;
  execute?(request: ExecutionRequest): Promise<ExecutionResult>;
}

// ─── Mozart Request/Response ───────────────────────────────
export interface MozartRequest {
  input: string;
  context?: string[];
  taskHint?: string;
  profile?: string;
  budgetMode?: BudgetMode;
  privacyMode?: PrivacyMode;
  executionMode?: ExecutionMode;
}

export interface MozartResponse {
  output?: string;
  route: RouteDecision;
  cost: CostEstimate;
  tokens: TokenUsage;
  privacy: PrivacyDecision;
  fallbacks: RouteDecision[];
  explanation: string[];
  logsRef?: string;
}

// ─── Skill/Tool Definitions ────────────────────────────────
export interface SkillDefinition {
  name: string;
  description: string;
  input: Record<string, SkillInputField>;
  output: Record<string, SkillOutputField>;
}

export interface SkillInputField {
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export interface SkillOutputField {
  type: string;
  description: string;
}

// ─── Session & Inventory ───────────────────────────────────
export interface InventorySnapshot {
  gateways: DetectionResult[];
  providers: Provider[];
  models: Model[];
  generatedAt: string;
  source: 'auto' | 'manual' | 'hybrid';
}

export interface SessionReport {
  requestsRouted: number;
  tokensOptimized: number;
  premiumCallsAvoided: number;
  estimatedSavingsPercent: number;
  providerFailuresRecovered: number;
  sensitiveFilesKeptLocal: number;
  routingDecisions: RouteDecision[];
  startTime: string;
  endTime: string;
}
