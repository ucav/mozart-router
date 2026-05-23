import { execSync } from 'child_process';

// Advanced context optimizer — uses local Ollama model for intelligent summarization.
// Falls back to the basic optimizer if Ollama is not available.

export interface SummarizeOptions {
  maxSummaryTokens?: number;
  model?: string;
  timeout?: number;
}

export class AdvancedContextOptimizer {
  private ollamaAvailable: boolean | null = null;

  private checkOllama(): boolean {
    if (this.ollamaAvailable !== null) return this.ollamaAvailable;
    try {
      execSync('ollama list', { stdio: 'pipe', timeout: 3000 });
      this.ollamaAvailable = true;
    } catch {
      this.ollamaAvailable = false;
    }
    return this.ollamaAvailable;
  }

  async summarize(content: string, options?: SummarizeOptions): Promise<string> {
    if (!this.checkOllama()) {
      // Fallback: plain truncation
      return this.fallbackSummarize(content, options?.maxSummaryTokens ?? 500);
    }

    const model = options?.model ?? 'qwen2.5:3b';
    const maxTokens = options?.maxSummaryTokens ?? 500;

    const prompt = `Summarize the following content concisely. Keep key facts, names, code references, and file paths. Remove redundancy.\n\nContent:\n${content.slice(0, 16000)}\n\nSummary:`;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            num_predict: maxTokens,
            temperature: 0.3,
          },
        }),
        signal: AbortSignal.timeout(options?.timeout ?? 30000),
      });

      if (!response.ok) return this.fallbackSummarize(content, maxTokens);

      const data = await response.json() as { response?: string };
      return data.response?.trim() ?? this.fallbackSummarize(content, maxTokens);
    } catch {
      return this.fallbackSummarize(content, maxTokens);
    }
  }

  private fallbackSummarize(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) return content;

    // Smart truncation: keep first and last parts, compress middle
    const headSize = Math.floor(maxChars * 0.6);
    const tailSize = Math.floor(maxChars * 0.3);

    const head = content.slice(0, headSize);
    const tail = content.slice(-tailSize);

    return head + '\n\n[... truncated for length ...]\n\n' + tail;
  }
}
