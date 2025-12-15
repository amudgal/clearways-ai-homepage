// Calculation Service - Backend Calculation Engine
// Deterministic calculations based on technical specification

import { pool } from '../config/database';

export interface CalculationInputs {
  mstr_license_per_instance: number;
  ancillary_license_pct: number;
  instance_count: number;
  hosting_environment: 'AWS' | 'GCP' | 'Azure';
  tier_selections: Record<string, string>;
  storage_gb: number;
  egress_gb: number;
  compute_gb: number;
  infrastructure_gb: number;
  cloud_personnel_cost: number;
  mstr_support_cost: number;
}

export interface CalculationResults {
  annualized_licensing: number;
  annualized_metered_costs: number;
  annualized_support_costs: number;
  total_cost: number;
  confidence_scores: Record<string, number>;
  sensitivity_ratings: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>;
  cost_breakdown: {
    licensing: {
      mstr_licensing: number;
      ancillary_licensing: number;
      total: number;
    };
    metered: {
      compute: number;
      infrastructure: number;
      storage: number;
      egress: number;
      total: number;
    };
    support: {
      cloud_personnel: number;
      mstr_support: number;
      total: number;
    };
    total: number;
  };
}

export class CalculationService {
  /**
   * Get pricing data from database for a specific provider and pricing version
   */
  static async getPricingData(
    provider: 'AWS' | 'GCP' | 'Azure',
    pricingVersionId: string
  ): Promise<Record<string, { unit_price: number; annual_multiplier: number }>> {
    const result = await pool.query(
      `SELECT service_type, unit_price, annual_multiplier
       FROM site_cloud_pricing
       WHERE pricing_version_id = $1 AND provider = $2`,
      [pricingVersionId, provider]
    );

    const pricing: Record<string, { unit_price: number; annual_multiplier: number }> = {};
    
    for (const row of result.rows) {
      pricing[row.service_type] = {
        unit_price: parseFloat(row.unit_price),
        annual_multiplier: parseFloat(row.annual_multiplier),
      };
    }

    return pricing;
  }

  /**
   * Calculate annualized licensing costs
   */
  static calculateLicensing(inputs: CalculationInputs): number {
    const mstrLicensing = inputs.mstr_license_per_instance * inputs.instance_count;
    const ancillaryLicensing = mstrLicensing * (inputs.ancillary_license_pct / 100);
    return mstrLicensing + ancillaryLicensing;
  }

  /**
   * Calculate annualized metered costs using database pricing
   */
  static async calculateMeteredCosts(
    inputs: CalculationInputs,
    pricing: Record<string, { unit_price: number; annual_multiplier: number }>
  ): Promise<number> {
    const computePricing = pricing['compute'] || { unit_price: 0.12, annual_multiplier: 8760 };
    const infrastructurePricing = pricing['infrastructure'] || { unit_price: 0.08, annual_multiplier: 12 };
    const storagePricing = pricing['storage'] || { unit_price: 0.023, annual_multiplier: 12 };
    const egressPricing = pricing['egress'] || { unit_price: 0.09, annual_multiplier: 1 };

    const computeCost = computePricing.unit_price * computePricing.annual_multiplier * inputs.compute_gb * inputs.instance_count;
    const infrastructureCost = infrastructurePricing.unit_price * infrastructurePricing.annual_multiplier * inputs.infrastructure_gb * inputs.instance_count;
    const storageCost = storagePricing.unit_price * storagePricing.annual_multiplier * inputs.storage_gb * inputs.instance_count;
    const egressCost = egressPricing.unit_price * egressPricing.annual_multiplier * inputs.egress_gb * inputs.instance_count;

    return computeCost + infrastructureCost + storageCost + egressCost;
  }

  /**
   * Calculate annualized support costs
   */
  static async calculateSupportCosts(
    inputs: CalculationInputs,
    licensingCost: number,
    meteredCost: number,
    pricing: Record<string, { unit_price: number; annual_multiplier: number }>
  ): Promise<number> {
    const cloudPersonnel = inputs.cloud_personnel_cost;
    const mstrSupport = inputs.mstr_support_cost;

    // Support percentage from pricing (default 15%)
    const supportPricing = pricing['support'] || { unit_price: 0.15, annual_multiplier: 1 };
    const supportPercentage = supportPricing.unit_price;

    const componentCosts = licensingCost + meteredCost;
    const supportOverhead = componentCosts * supportPercentage;

    return cloudPersonnel + supportOverhead + mstrSupport;
  }

  /**
   * Calculate confidence scores
   */
  static calculateConfidenceScores(inputs: CalculationInputs): Record<string, number> {
    return {
      licensing: inputs.mstr_license_per_instance > 0 ? 5 : 1,
      compute: inputs.compute_gb > 0 ? 3 : 1,
      infrastructure: inputs.infrastructure_gb > 0 ? 4 : 1,
      storage: inputs.storage_gb > 0 ? 4 : 1,
      egress: inputs.egress_gb > 0 ? 3 : 1,
      cloud_personnel: inputs.cloud_personnel_cost > 0 ? 4 : 2,
      mstr_support: inputs.mstr_support_cost >= 0 ? 5 : 1,
    };
  }

  /**
   * Calculate sensitivity ratings
   */
  static calculateSensitivityRatings(): Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> {
    return {
      licensing: 'LOW',
      compute: 'HIGH',
      infrastructure: 'MEDIUM',
      storage: 'MEDIUM',
      egress: 'HIGH',
      cloud_personnel: 'MEDIUM',
      mstr_support: 'LOW',
    };
  }

  /**
   * Generate detailed cost breakdown
   */
  static async generateCostBreakdown(
    inputs: CalculationInputs,
    pricing: Record<string, { unit_price: number; annual_multiplier: number }>
  ): Promise<CalculationResults['cost_breakdown']> {
    const computePricing = pricing['compute'] || { unit_price: 0.12, annual_multiplier: 8760 };
    const infrastructurePricing = pricing['infrastructure'] || { unit_price: 0.08, annual_multiplier: 12 };
    const storagePricing = pricing['storage'] || { unit_price: 0.023, annual_multiplier: 12 };
    const egressPricing = pricing['egress'] || { unit_price: 0.09, annual_multiplier: 1 };
    const supportPricing = pricing['support'] || { unit_price: 0.15, annual_multiplier: 1 };

    // Licensing
    const mstrLicensing = inputs.mstr_license_per_instance * inputs.instance_count;
    const ancillaryLicensing = mstrLicensing * (inputs.ancillary_license_pct / 100);
    const totalLicensing = mstrLicensing + ancillaryLicensing;

    // Metered costs
    const computeCost = computePricing.unit_price * computePricing.annual_multiplier * inputs.compute_gb * inputs.instance_count;
    const infrastructureCost = infrastructurePricing.unit_price * infrastructurePricing.annual_multiplier * inputs.infrastructure_gb * inputs.instance_count;
    const storageCost = storagePricing.unit_price * storagePricing.annual_multiplier * inputs.storage_gb * inputs.instance_count;
    const egressCost = egressPricing.unit_price * egressPricing.annual_multiplier * inputs.egress_gb * inputs.instance_count;
    const totalMetered = computeCost + infrastructureCost + storageCost + egressCost;

    // Support costs
    const cloudPersonnel = inputs.cloud_personnel_cost;
    const mstrSupport = inputs.mstr_support_cost;
    const componentCosts = totalLicensing + totalMetered;
    const supportOverhead = componentCosts * supportPricing.unit_price;
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
   * Compute full analysis results
   */
  static async computeAnalysis(
    inputs: CalculationInputs,
    pricingVersionId: string
  ): Promise<CalculationResults> {
    // Get pricing data from database
    const pricing = await this.getPricingData(inputs.hosting_environment, pricingVersionId);

    // Calculate costs
    const licensing = this.calculateLicensing(inputs);
    const metered = await this.calculateMeteredCosts(inputs, pricing);
    const support = await this.calculateSupportCosts(inputs, licensing, metered, pricing);
    const total = licensing + metered + support;

    // Generate breakdown and scores
    const costBreakdown = await this.generateCostBreakdown(inputs, pricing);
    const confidenceScores = this.calculateConfidenceScores(inputs);
    const sensitivityRatings = this.calculateSensitivityRatings();

    return {
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

