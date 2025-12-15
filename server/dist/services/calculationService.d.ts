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
export declare class CalculationService {
    /**
     * Get pricing data from database for a specific provider and pricing version
     */
    static getPricingData(provider: 'AWS' | 'GCP' | 'Azure', pricingVersionId: string): Promise<Record<string, {
        unit_price: number;
        annual_multiplier: number;
    }>>;
    /**
     * Calculate annualized licensing costs
     */
    static calculateLicensing(inputs: CalculationInputs): number;
    /**
     * Calculate annualized metered costs using database pricing
     */
    static calculateMeteredCosts(inputs: CalculationInputs, pricing: Record<string, {
        unit_price: number;
        annual_multiplier: number;
    }>): Promise<number>;
    /**
     * Calculate annualized support costs
     */
    static calculateSupportCosts(inputs: CalculationInputs, licensingCost: number, meteredCost: number, pricing: Record<string, {
        unit_price: number;
        annual_multiplier: number;
    }>): Promise<number>;
    /**
     * Calculate confidence scores
     */
    static calculateConfidenceScores(inputs: CalculationInputs): Record<string, number>;
    /**
     * Calculate sensitivity ratings
     */
    static calculateSensitivityRatings(): Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>;
    /**
     * Generate detailed cost breakdown
     */
    static generateCostBreakdown(inputs: CalculationInputs, pricing: Record<string, {
        unit_price: number;
        annual_multiplier: number;
    }>): Promise<CalculationResults['cost_breakdown']>;
    /**
     * Compute full analysis results
     */
    static computeAnalysis(inputs: CalculationInputs, pricingVersionId: string): Promise<CalculationResults>;
}
//# sourceMappingURL=calculationService.d.ts.map