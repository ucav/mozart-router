import { SkillDefinition } from '../types';

export const ROUTE_MODEL_SKILL: SkillDefinition = {
  name: 'mozart.route_model',
  description: 'Choose the best available model/provider/gateway for an AI task based on cost, context, latency, privacy, and capabilities.',
  input: {
    task: { type: 'string', description: 'The task to route', required: true },
    context_size: { type: 'number', description: 'Estimated context size in tokens', required: false },
    privacy_mode: { type: 'string', description: 'Privacy level', required: false, enum: ['open', 'balanced', 'privacy_first', 'local_only'] },
    budget_mode: { type: 'string', description: 'Budget preference', required: false, enum: ['lowest', 'balanced', 'quality'] },
    required_capabilities: {
      type: 'array', description: 'Required capabilities: code, reasoning, long_context, json, tools, vision', required: false,
    },
  },
  output: {
    selected_gateway: { type: 'string', description: 'Selected gateway' },
    selected_provider: { type: 'string', description: 'Selected provider' },
    selected_model: { type: 'string', description: 'Selected model' },
    confidence: { type: 'number', description: 'Confidence score (0-1)' },
    context_strategy: { type: 'string', description: 'How to handle context' },
    estimated_cost: { type: 'number', description: 'Estimated cost in USD' },
    fallback_chain: { type: 'array', description: 'Ordered fallback models' },
    explanation: { type: 'array', description: 'Human-readable explanation' },
  },
};

export const EXPLAIN_ROUTE_SKILL: SkillDefinition = {
  name: 'mozart.explain_route',
  description: 'Explain why Mozart chose a specific model/provider for the last task.',
  input: {},
  output: {
    explanation: { type: 'string', description: 'Detailed explanation of routing decision' },
  },
};

export const ESTIMATE_COST_SKILL: SkillDefinition = {
  name: 'mozart.estimate_cost',
  description: 'Estimate the token usage and cost for a given task before execution.',
  input: {
    task: { type: 'string', description: 'Task description', required: true },
    context: { type: 'string', description: 'Context to be sent', required: false },
    model: { type: 'string', description: 'Target model (optional, for estimation)', required: false },
  },
  output: {
    estimated_input_tokens: { type: 'number', description: 'Estimated input tokens' },
    estimated_output_tokens: { type: 'number', description: 'Estimated output tokens' },
    estimated_cost: { type: 'number', description: 'Estimated cost in USD' },
    currency: { type: 'string', description: 'Currency' },
  },
};

export const COMPRESS_CONTEXT_SKILL: SkillDefinition = {
  name: 'mozart.compress_context',
  description: 'Optimize and compress context to reduce token usage while preserving relevant information.',
  input: {
    content: { type: 'string', description: 'Content to compress', required: true },
    max_tokens: { type: 'number', description: 'Maximum tokens allowed', required: false },
    strategy: { type: 'string', description: 'Compression strategy', required: false, enum: ['compress', 'truncate', 'summarize', 'select_relevant'] },
  },
  output: {
    strategy: { type: 'string', description: 'Applied strategy' },
    original_tokens: { type: 'number', description: 'Original token count' },
    compressed_tokens: { type: 'number', description: 'Compressed token count' },
    compression_ratio: { type: 'number', description: 'Compression ratio' },
  },
};

export const PRIVACY_CHECK_SKILL: SkillDefinition = {
  name: 'mozart.privacy_check',
  description: 'Scan content for secrets, API keys, tokens, and sensitive data before sending to a model.',
  input: {
    content: { type: 'string', description: 'Content to scan', required: true },
    privacy_mode: { type: 'string', description: 'Privacy mode', required: false, enum: ['open', 'balanced', 'privacy_first', 'local_only'] },
  },
  output: {
    allowed: { type: 'boolean', description: 'Whether content is safe to send' },
    findings: { type: 'array', description: 'Detected sensitive items' },
    action: { type: 'string', description: 'Recommended action' },
    redacted_content: { type: 'string', description: 'Content with secrets redacted' },
  },
};

export const FALLBACK_PLAN_SKILL: SkillDefinition = {
  name: 'mozart.fallback_plan',
  description: 'Generate a fallback execution plan in case the primary model/provider fails.',
  input: {
    task: { type: 'string', description: 'Task description', required: true },
    primary_model: { type: 'string', description: 'Primary model ID', required: false },
  },
  output: {
    primary: { type: 'object', description: 'Primary route' },
    fallbacks: { type: 'array', description: 'Ordered fallback routes' },
    retry_policy: { type: 'string', description: 'Retry configuration' },
  },
};

export const INVENTORY_SKILL: SkillDefinition = {
  name: 'mozart.inventory',
  description: 'Return the current inventory of detected gateways, providers, and models.',
  input: {},
  output: {
    gateways: { type: 'array', description: 'Detected gateways' },
    providers: { type: 'array', description: 'Available providers' },
    models: { type: 'array', description: 'Available models' },
    generated_at: { type: 'string', description: 'Inventory generation time' },
  },
};

export const ALL_SKILLS: SkillDefinition[] = [
  ROUTE_MODEL_SKILL,
  EXPLAIN_ROUTE_SKILL,
  ESTIMATE_COST_SKILL,
  COMPRESS_CONTEXT_SKILL,
  PRIVACY_CHECK_SKILL,
  FALLBACK_PLAN_SKILL,
  INVENTORY_SKILL,
];
