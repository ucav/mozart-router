import { RouteDecision, TaskProfile, CostEstimate, PrivacyDecision } from '../types';

export class ExplainabilityEngine {
  explain(
    route: RouteDecision,
    task: TaskProfile,
    cost: CostEstimate,
    privacy: PrivacyDecision,
  ): string[] {
    const lines: string[] = [];

    lines.push(`Task classified: ${task.taskType}`);
    lines.push(`  Complexity: ${task.complexity}`);
    lines.push(`  Context need: ${task.contextNeed}`);

    lines.push('');
    if (route.selectedGateway) {
      lines.push(`Gateway: ${route.selectedGateway}`);
    }
    lines.push(`Selected model: ${route.selectedProvider} / ${route.selectedModel}`);
    lines.push(`Confidence: ${Math.round(route.confidence * 100)}%`);
    lines.push(`Score: ${route.score}`);

    lines.push('');
    lines.push('Selection factors:');
    for (const exp of route.explanation) {
      lines.push(`  ${exp}`);
    }

    lines.push('');
    lines.push(`Estimated cost: $${cost.totalCost.toFixed(4)} ${cost.currency}`);
    if (cost.savingsPercentage !== undefined) {
      lines.push(`Estimated savings: ${cost.savingsPercentage}% vs premium alternative`);
    }
    if (cost.comparedToPremium !== undefined && cost.comparedToPremium > 0) {
      lines.push(`Compared to premium: $${cost.comparedToPremium.toFixed(4)}`);
    }

    lines.push('');
    lines.push(`Context strategy: ${route.contextStrategy}`);

    lines.push('');
    lines.push('Privacy:');
    if (privacy.findings.length === 0) {
      lines.push('  No sensitive data detected');
    } else {
      for (const f of privacy.findings) {
        lines.push(`  ${f.type} → ${f.action} (${f.severity})`);
      }
    }

    lines.push('');
    lines.push('Fallback chain:');
    if (route.fallbacks.length === 0) {
      lines.push('  No fallbacks available');
    } else {
      for (const fb of route.fallbacks) {
        lines.push(`  ${fb.selectedProvider}/${fb.selectedModel} (confidence: ${Math.round(fb.confidence * 100)}%)`);
      }
    }

    return lines;
  }

  explainRoute(route: RouteDecision): string[] {
    return route.explanation;
  }
}
