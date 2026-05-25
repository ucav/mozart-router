import { ContextStrategy, TaskProfile } from '../types';

export class ContextOptimizer {
  optimize(
    input: string,
    contextItems: string[],
    profile: TaskProfile,
  ): ContextStrategy {
    const totalInput = [input, ...contextItems].join('\n\n');
    const estimatedTokens = this.estimateTokens(totalInput);

    // Model-agnostic context limits
    let maxTokens = 32000;
    if (profile.contextNeed === 'very_high') {
      maxTokens = 200000;
    } else if (profile.contextNeed === 'high') {
      maxTokens = 128000;
    } else if (profile.contextNeed === 'medium') {
      maxTokens = 32000;
    } else {
      maxTokens = 8000;
    }

    if (estimatedTokens <= maxTokens * 0.9) {
      return {
        action: 'send_all',
        estimatedInputTokens: estimatedTokens,
        maxTokens,
        instructions: ['Fit within context window — sending full input.'],
      };
    }

    // Compression strategies
    if (profile.contextNeed === 'very_high') {
      return {
        action: 'truncate',
        estimatedInputTokens: maxTokens,
        maxTokens,
        compressionRatio: maxTokens / estimatedTokens,
        instructions: [
          `Optimizing for long context: ${estimatedTokens} tokens → ${maxTokens} max.`,
          'Consider summarizing non-essential sections.',
          'Prioritize most recent/relevant context items.',
        ],
      };
    }

    if (profile.taskType === 'summarize' || profile.taskType === 'chat') {
      const compressedTokens = Math.min(estimatedTokens, maxTokens);
      const ratio = estimatedTokens > 0 ? compressedTokens / estimatedTokens : 1;
      return {
        action: 'compress',
        estimatedInputTokens: compressedTokens,
        maxTokens,
        compressionRatio: Math.round(ratio * 100) / 100,
        instructions: [
          `Compressing context: ${estimatedTokens} tokens → ~${Math.floor(estimatedTokens * 0.7)} tokens.`,
          'Remove redundant content.',
          'Keep key information intact.',
        ],
      };
    }

    if (profile.requiresCodeStrength) {
      return {
        action: 'select_relevant',
        estimatedInputTokens: Math.min(estimatedTokens, maxTokens),
        maxTokens,
        instructions: [
          `Selecting relevant context for ${profile.taskType}.`,
          'Keep code files directly related to the task.',
          'Filter out irrelevant files.',
        ],
      };
    }

    return {
      action: 'truncate',
      estimatedInputTokens: maxTokens,
      maxTokens,
      compressionRatio: maxTokens / estimatedTokens,
      instructions: ['Context exceeds window — truncating.'],
    };
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token for English text
    return Math.ceil(text.length / 4);
  }

  estimateForModel(text: string, maxContextWindow: number): ContextStrategy {
    const tokens = this.estimateTokens(text);
    if (tokens < maxContextWindow * 0.9) {
      return {
        action: 'send_all',
        estimatedInputTokens: tokens,
        maxTokens: maxContextWindow,
        instructions: ['Fits within model context window.'],
      };
    }
    return {
      action: 'truncate',
      estimatedInputTokens: maxContextWindow,
      maxTokens: maxContextWindow,
      compressionRatio: maxContextWindow / tokens,
      instructions: [`Content exceeds model context window (${maxContextWindow} tokens). Truncating.`],
    };
  }
}
