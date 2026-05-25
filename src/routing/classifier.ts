import { TaskProfile, TaskType, Complexity, ContextNeed, PrivacyNeed, LatencyPreference, CostPreference } from '../types';

const TASK_PATTERNS: Array<{ pattern: RegExp; taskType: TaskType; complexity: Complexity; contextNeed: ContextNeed; priority: number }> = [
  { pattern: /\b(write|create|generate|build)\s.*tests?\b/i, taskType: 'test_writing', complexity: 'medium', contextNeed: 'high', priority: 95 },
  { pattern: /\b(test|spec)\s/i, taskType: 'test_writing', complexity: 'medium', contextNeed: 'medium', priority: 85 },
  { pattern: /\b(debug|fix|error|bug|issue|crash|fails?|failing|broken|not working)\b/i, taskType: 'debugging', complexity: 'high', contextNeed: 'very_high', priority: 90 },
  { pattern: /\b(refactor|rewrite|restructure|clean\s*up|improve\s*code)\b/i, taskType: 'refactor', complexity: 'high', contextNeed: 'high', priority: 92 },
  { pattern: /\b(review|audit|check|inspect)\s.*(code|security|vuln)\b/i, taskType: 'security_audit', complexity: 'high', contextNeed: 'high', priority: 93 },
  { pattern: /\b(security|vulnerability|exploit)\b/i, taskType: 'security_audit', complexity: 'critical', contextNeed: 'high', priority: 94 },
  { pattern: /\b(design|architecture|architect|system\s*design|component)\b/i, taskType: 'architecture', complexity: 'high', contextNeed: 'high', priority: 88 },
  { pattern: /\b(summarize|summary|tldr|recap|brief)\b/i, taskType: 'summarize', complexity: 'low', contextNeed: 'high', priority: 86 },
  { pattern: /\b(translate|translation|localize)\b/i, taskType: 'translate', complexity: 'low', contextNeed: 'medium', priority: 80 },
  { pattern: /\b(extract|parse|pull|scrape)\b/i, taskType: 'extract', complexity: 'low', contextNeed: 'medium', priority: 75 },
  { pattern: /\b(plan|roadmap|strategy|steps?\s*to|approach|proposal)\b/i, taskType: 'planning', complexity: 'medium', contextNeed: 'medium', priority: 78 },
  { pattern: /\b(research|investigate|look\s*up|find|search)\b/i, taskType: 'web_research', complexity: 'medium', contextNeed: 'medium', priority: 72 },
  { pattern: /\b(data|analysis|analyze|statistics|metrics)\b/i, taskType: 'data_analysis', complexity: 'medium', contextNeed: 'medium', priority: 74 },
  { pattern: /\b(story|write\s.*story|creative|poem|fiction|narrative)\b/i, taskType: 'creative_writing', complexity: 'low', contextNeed: 'low', priority: 70 },
  { pattern: /\b(format|beautify|prettify|style|indent)\b/i, taskType: 'formatting', complexity: 'low', contextNeed: 'low', priority: 65 },
  { pattern: /\b(edit|modify|update|change|patch)\s.*(file|code|component)\b/i, taskType: 'file_editing', complexity: 'medium', contextNeed: 'high', priority: 82 },
  { pattern: /\b(loop|agent|autonomous|repeated|repeatedly|process\s.*multiple)\b/i, taskType: 'agent_loop', complexity: 'high', contextNeed: 'very_high', priority: 84 },
  { pattern: /\b(long\s*context|large\s*files?|huge|massive|entire\s*codebase)\b/i, taskType: 'long_context_reasoning', complexity: 'high', contextNeed: 'very_high', priority: 87 },
  { pattern: /\b(code|implement|develop|build|add|feature|component|function|class|module|api|endpoint|route)\b/i, taskType: 'code_generation', complexity: 'medium', contextNeed: 'high', priority: 45 },
  { pattern: /\b(review|pr\s*review|pull\s*request|merge)\b/i, taskType: 'code_review', complexity: 'medium', contextNeed: 'high', priority: 77 },
];

export class TaskClassifier {
  classify(input: string, taskHint?: string): TaskProfile {
    const combined = taskHint ? `${taskHint} ${input}` : input;
    let bestMatch: { taskType: TaskType; complexity: Complexity; contextNeed: ContextNeed } | null = null;
    let bestScore = 0;

    for (const { pattern, taskType, complexity, contextNeed, priority } of TASK_PATTERNS) {
      const matchResult = combined.match(pattern);
      if (!matchResult) continue;
      // Count matches: use full match only, not capture groups.
      // RegExp without /g returns [full, ...captures], so length > 1 = captures.
      // We score by: whether it matched (1) × priority.
      const score = priority;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { taskType, complexity, contextNeed };
      }
    }

    if (!bestMatch) {
      bestMatch = {
        taskType: 'chat',
        complexity: 'low',
        contextNeed: 'low',
      };
    }

    // Heuristic adjustments
    let requiresCodeStrength = [
      'code_generation', 'code_review', 'refactor', 'debugging', 'test_writing', 'security_audit',
    ].includes(bestMatch.taskType);
    let requiresLongContext = bestMatch.contextNeed === 'very_high';
    let requiresReasoning = ['debugging', 'architecture', 'refactor', 'security_audit', 'long_context_reasoning'].includes(bestMatch.taskType);
    let requiresTools = ['code_generation', 'file_editing', 'agent_loop', 'debugging', 'test_writing'].includes(bestMatch.taskType);
    let requiresJson = ['extract', 'data_analysis', 'translate'].includes(bestMatch.taskType);
    let requiresVision = false;

    // Long context heuristic
    if (input.length > 50000 || combined.length > 50000) {
      requiresLongContext = true;
      if (bestMatch.contextNeed !== 'very_high') bestMatch.contextNeed = 'high';
    }

    let privacyNeed: PrivacyNeed = 'low';
    if (['security_audit', 'data_analysis'].includes(bestMatch.taskType)) {
      privacyNeed = 'high';
    } else if (['file_editing', 'agent_loop'].includes(bestMatch.taskType)) {
      privacyNeed = 'medium';
    }

    let latencyPreference: LatencyPreference = 'balanced';
    if (bestMatch.taskType === 'chat' || bestMatch.taskType === 'formatting') {
      latencyPreference = 'fast';
    } else if (['architecture', 'security_audit', 'refactor'].includes(bestMatch.taskType)) {
      latencyPreference = 'quality';
    }

    let costPreference: CostPreference = 'balanced';
    if (['chat', 'formatting', 'translate'].includes(bestMatch.taskType)) {
      costPreference = 'lowest';
    } else if (['architecture', 'security_audit'].includes(bestMatch.taskType)) {
      costPreference = 'quality';
    }

    return {
      taskType: bestMatch.taskType,
      complexity: bestMatch.complexity,
      contextNeed: bestMatch.contextNeed,
      privacyNeed,
      latencyPreference,
      costPreference,
      requiresTools,
      requiresJson,
      requiresLongContext,
      requiresCodeStrength,
      requiresVision,
      requiresReasoning,
    };
  }
}
