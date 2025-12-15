// Calculation Engine - Authoritative Logic
// Deterministic calculations based on technical specification

import { AnalysisInputs, AnalysisComputedResults, CostBreakdown, PricingData } from '../types';

// Default pricing data (in production, fetch from PricingVersion)
const DEFAULT_PRICING: PricingData = {
  compute: {
    hourly_rate: 0.12, // $0.12 per hour
    annual_multiplier: 8760, // hours per year
  },
  infrastructure: {
    gb_month_rate: 0.08, // $0.08 per GB-month
    annual_multiplier: 12, // months per year
  },
  storage: {
    gb_month_rate: 0.023, // $0.023 per GB-month
    annual_multiplier: 12,
  },
  egress: {
    gb_rate: 0.09, // $0.09 per GB
    annual_multiplier: 1, // egress is already per-GB, not time-based
  },
  support_percentage: 0.15, // 15% support overhead
};

export class CalculationEngine {
  /**
   * Calculate annualized licensing costs
   * Formula: (MSTR License per Instance × Number of Instances) + (Ancillary % × MSTR License)
   */
  static calculateLicensing(inputs: AnalysisInputs): number {
    const mstrLicensing = inputs.mstr_license_per_instance * inputs.instance_count;
    const ancillaryLicensing = mstrLicensing * (inputs.ancillary_license_pct / 100);
    return mstrLicensing + ancillaryLicensing;
  }

  /**
   * Calculate annualized metered costs
   * Includes: Compute, Infrastructure, Storage, Egress
   */
  static calculateMeteredCosts(inputs: AnalysisInputs, pricing: PricingData = DEFAULT_PRICING): number {
    // Compute: Hourly-based units
    const computeCost = pricing.compute.hourly_rate * pricing.compute.annual_multiplier * inputs.compute_gb * inputs.instance_count;

    // Infrastructure: Monthly per GB
    const infrastructureCost = pricing.infrastructure.gb_month_rate * pricing.infrastructure.annual_multiplier * inputs.infrastructure_gb * inputs.instance_count;

    // Storage: Monthly per GB
    const storageCost = pricing.storage.gb_month_rate * pricing.storage.annual_multiplier * inputs.storage_gb * inputs.instance_count;

    // Egress: Per GB (not time-based)
    const egressCost = pricing.egress.gb_rate * pricing.egress.annual_multiplier * inputs.egress_gb * inputs.instance_count;

    return computeCost + infrastructureCost + storageCost + egressCost;
  }

  /**
   * Calculate annualized support costs
   * Formula: Cloud Personnel + (Support % × Total Component Costs) + MSTR Support
   */
  static calculateSupportCosts(
    inputs: AnalysisInputs,
    licensingCost: number,
    meteredCost: number,
    pricing: PricingData = DEFAULT_PRICING
  ): number {
    const cloudPersonnel = inputs.cloud_personnel_cost;
    const mstrSupport = inputs.mstr_support_cost;

    // Support percentage of total component costs (without support)
    const componentCosts = licensingCost + meteredCost;
    const supportOverhead = componentCosts * (pricing.support_percentage / 100);

    return cloudPersonnel + supportOverhead + mstrSupport;
  }

  /**
   * Calculate total cost
   */
  static calculateTotalCost(licensing: number, metered: number, support: number): number {
    return licensing + metered + support;
  }

  /**
   * Generate detailed cost breakdown
   */
  static generateCostBreakdown(inputs: AnalysisInputs, pricing: PricingData = DEFAULT_PRICING): CostBreakdown {
    // Licensing
    const mstrLicensing = inputs.mstr_license_per_instance * inputs.instance_count;
    const ancillaryLicensing = mstrLicensing * (inputs.ancillary_license_pct / 100);
    const totalLicensing = mstrLicensing + ancillaryLicensing;

    // Metered costs
    const computeCost = pricing.compute.hourly_rate * pricing.compute.annual_multiplier * inputs.compute_gb * inputs.instance_count;
    const infrastructureCost = pricing.infrastructure.gb_month_rate * pricing.infrastructure.annual_multiplier * inputs.infrastructure_gb * inputs.instance_count;
    const storageCost = pricing.storage.gb_month_rate * pricing.storage.annual_multiplier * inputs.storage_gb * inputs.instance_count;
    const egressCost = pricing.egress.gb_rate * pricing.egress.annual_multiplier * inputs.egress_gb * inputs.instance_count;
    const totalMetered = computeCost + infrastructureCost + storageCost + egressCost;

    // Support costs
    const cloudPersonnel = inputs.cloud_personnel_cost;
    const mstrSupport = inputs.mstr_support_cost;
    const componentCosts = totalLicensing + totalMetered;
    const supportOverhead = componentCosts * (pricing.support_percentage / 100);
    const totalSupport = cloudPersonnel + supportOverhead + mstrSupport;

    // Total
    const total = totalLicensing + totalMetered + totalSupport;

    return {
      licensing: {
        mstr_licensing: mstrLicensing,
        ancillary_licensing: ancillaryLicensing,
        total: totalLicensing,
      },
      metered: {
        compute: computeCost,
        infrastructure: infrastructureCost,
        storage: storageCost,
        egress: egressCost,
        total: totalMetered,
      },
      support: {
        cloud_personnel: cloudPersonnel,
        mstr_support: mstrSupport,
        total: totalSupport,
      },
      total,
    };
  }

  /**
   * Calculate confidence scores based on input completeness and pricing version
   */
  static calculateConfidenceScores(inputs: AnalysisInputs): Record<string, number> {
    const scores: Record<string, number> = {};

    // Licensing: High confidence (contractual)
    scores.licensing = inputs.mstr_license_per_instance > 0 ? 5 : 1;

    // Metered costs: Medium confidence (usage-based, variable)
    scores.compute = inputs.compute_gb > 0 ? 3 : 1;
    scores.infrastructure = inputs.infrastructure_gb > 0 ? 4 : 1;
    scores.storage = inputs.storage_gb > 0 ? 4 : 1;
    scores.egress = inputs.egress_gb > 0 ? 3 : 1;

    // Support: Variable confidence
    scores.cloud_personnel = inputs.cloud_personnel_cost > 0 ? 4 : 2;
    scores.mstr_support = inputs.mstr_support_cost >= 0 ? 5 : 1;

    return scores;
  }

  /**
   * Calculate sensitivity ratings
   */
  static calculateSensitivityRatings(inputs: AnalysisInputs): Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> {
    const ratings: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {};

    // Licensing: Low sensitivity (contractual, fixed)
    ratings.licensing = 'LOW';

    // Metered costs: High sensitivity (usage-based, variable)
    ratings.compute = 'HIGH';
    ratings.infrastructure = 'MEDIUM';
    ratings.storage = 'MEDIUM';
    ratings.egress = 'HIGH';

    // Support: Medium sensitivity
    ratings.cloud_personnel = 'MEDIUM';
    ratings.mstr_support = 'LOW';

    return ratings;
  }

  /**
   * Compute full analysis results
   */
  static computeAnalysis(inputs: AnalysisInputs, pricing: PricingData = DEFAULT_PRICING): AnalysisComputedResults {
    const licensing = this.calculateLicensing(inputs);
    const metered = this.calculateMeteredCosts(inputs, pricing);
    const support = this.calculateSupportCosts(inputs, licensing, metered, pricing);
    const total = this.calculateTotalCost(licensing, metered, support);

    const costBreakdown = this.generateCostBreakdown(inputs, pricing);
    const confidenceScores = this.calculateConfidenceScores(inputs);
    const sensitivityRatings = this.calculateSensitivityRatings(inputs);

    return {
      analysis_id: inputs.analysis_id,
      annualized_licensing: licensing,
      annualized_metered_costs: metered,
      annualized_support_costs: support,
      total_cost: total,
      confidence_scores: confidenceScores,
      sensitivity_ratings: sensitivityRatings,
      cost_breakdown: costBreakdown,
    };
  }
}

