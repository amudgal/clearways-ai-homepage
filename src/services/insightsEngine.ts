// Dynamic Insights Engine - Rule-based insights derived from computed results

import { AnalysisComputedResults, Insight } from '../types';

export class InsightsEngine {
  /**
   * Generate insights based on computed results
   */
  static generateInsights(results: AnalysisComputedResults): Insight[] {
    const insights: Insight[] = [];

    const { cost_breakdown, confidence_scores, sensitivity_ratings, total_cost } = results;

    // Insight 1: Compute dominance check
    const computePercentage = (cost_breakdown.metered.compute / total_cost) * 100;
    if (computePercentage > 50) {
      insights.push({
        id: 'insight-1',
        type: 'WARNING',
        title: 'Compute Costs Dominate TCO',
        description: `Compute costs represent ${computePercentage.toFixed(1)}% of total cost. Consider optimizing compute usage or exploring reserved instances for cost reduction.`,
        severity: 'HIGH',
      });
    }

    // Insight 2: Storage confidence check
    if (confidence_scores.storage && confidence_scores.storage < 3) {
      insights.push({
        id: 'insight-2',
        type: 'WARNING',
        title: 'Low Confidence in Storage Forecast',
        description: 'Storage usage estimates have low confidence. Actual costs may vary significantly from projections.',
        severity: 'MEDIUM',
      });
    }

    // Insight 3: Licensing percentage check
    const licensingPercentage = (cost_breakdown.licensing.total / total_cost) * 100;
    if (licensingPercentage < 30) {
      insights.push({
        id: 'insight-3',
        type: 'INFO',
        title: 'Decision-Driven Cost Volatility',
        description: `Licensing represents only ${licensingPercentage.toFixed(1)}% of TCO. Most costs are variable and driven by architecture decisions, providing significant optimization opportunities.`,
        severity: 'MEDIUM',
      });
    }

    // Insight 4: High sensitivity components
    const highSensitivityComponents = Object.entries(sensitivity_ratings)
      .filter(([_, rating]) => rating === 'HIGH')
      .map(([component]) => component);

    if (highSensitivityComponents.length > 2) {
      insights.push({
        id: 'insight-4',
        type: 'RECOMMENDATION',
        title: 'Multiple High-Sensitivity Cost Components',
        description: `Several cost components (${highSensitivityComponents.join(', ')}) have high sensitivity to usage changes. Consider implementing usage monitoring and optimization strategies.`,
        severity: 'HIGH',
      });
    }

    // Insight 5: Egress cost warning
    if (cost_breakdown.metered.egress > total_cost * 0.15) {
      insights.push({
        id: 'insight-5',
        type: 'WARNING',
        title: 'High Data Egress Costs',
        description: `Data egress represents ${((cost_breakdown.metered.egress / total_cost) * 100).toFixed(1)}% of total cost. Consider data locality strategies to reduce egress charges.`,
        severity: 'MEDIUM',
      });
    }

    // Insight 6: Support cost optimization
    const supportPercentage = (cost_breakdown.support.total / total_cost) * 100;
    if (supportPercentage > 25) {
      insights.push({
        id: 'insight-6',
        type: 'RECOMMENDATION',
        title: 'Support Costs Optimization Opportunity',
        description: `Support costs represent ${supportPercentage.toFixed(1)}% of TCO. Managed service options may provide better cost efficiency.`,
        severity: 'MEDIUM',
      });
    }

    // Insight 7: Low confidence overall
    const avgConfidence = Object.values(confidence_scores).reduce((sum, score) => sum + score, 0) / Object.keys(confidence_scores).length;
    if (avgConfidence < 3) {
      insights.push({
        id: 'insight-7',
        type: 'WARNING',
        title: 'Overall Low Confidence in Projections',
        description: 'Multiple cost components have low confidence scores. Consider validating inputs and gathering more accurate usage data before making decisions.',
        severity: 'HIGH',
      });
    }

    // Insight 8: Infrastructure vs Compute ratio
    if (cost_breakdown.metered.compute > 0) {
      const infraRatio = cost_breakdown.metered.infrastructure / cost_breakdown.metered.compute;
      if (infraRatio > 0.5) {
        insights.push({
          id: 'insight-8',
          type: 'INFO',
          title: 'Infrastructure Overhead',
          description: 'Infrastructure costs are significant relative to compute. Review cluster configuration and resource allocation strategies.',
          severity: 'LOW',
        });
      }
    }

    return insights.sort((a, b) => {
      // Sort by severity: HIGH > MEDIUM > LOW
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get insights summary (count by type)
   */
  static getInsightsSummary(insights: Insight[]): { warnings: number; recommendations: number; info: number } {
    return {
      warnings: insights.filter(i => i.type === 'WARNING').length,
      recommendations: insights.filter(i => i.type === 'RECOMMENDATION').length,
      info: insights.filter(i => i.type === 'INFO').length,
    };
  }
}

