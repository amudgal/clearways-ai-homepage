// Analysis Service - Lifecycle Management (LIVE, SAVED, LOCKED)
// Tenant isolation enforced

import { Analysis, AnalysisInputs, AnalysisComputedResults, AnalysisStatus, User } from '../types';
import { CalculationEngine } from './calculationEngine';

// In-memory store (in production, use database with tenant isolation)
const analysisStore = new Map<string, Analysis>();
const inputsStore = new Map<string, AnalysisInputs>();
const resultsStore = new Map<string, AnalysisComputedResults>();

export class AnalysisService {
  /**
   * Create a new LIVE analysis (unsaved, in-memory only)
   */
  static createLiveAnalysis(user: User): Analysis {
    const analysis: Analysis = {
      id: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: user.tenant_id,
      status: 'LIVE',
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      saved_at: null,
      locked_at: null,
      pricing_version: 'v1.0', // In production, fetch from PricingVersion
    };

    analysisStore.set(analysis.id, analysis);
    return analysis;
  }

  /**
   * Get analysis by ID with tenant isolation
   */
  static getAnalysis(analysisId: string, user: User): Analysis | null {
    const analysis = analysisStore.get(analysisId);
    if (!analysis) return null;

    // Tenant isolation: Users can only access their tenant's analyses
    // Admins can access all tenants
    if (user.role !== 'ADMIN' && analysis.tenant_id !== user.tenant_id) {
      return null;
    }

    return analysis;
  }

  /**
   * Get all analyses for a tenant (with admin override)
   */
  static getAnalyses(user: User): Analysis[] {
    const analyses: Analysis[] = [];

    for (const analysis of analysisStore.values()) {
      // Tenant isolation
      if (user.role === 'ADMIN' || analysis.tenant_id === user.tenant_id) {
        analyses.push(analysis);
      }
    }

    // Sort by updated_at descending
    return analyses.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  /**
   * Save analysis (transition from LIVE to SAVED)
   */
  static saveAnalysis(
    analysisId: string,
    inputs: AnalysisInputs,
    title: string,
    user: User
  ): { success: boolean; analysis?: Analysis; message: string } {
    const analysis = this.getAnalysis(analysisId, user);
    if (!analysis) {
      return { success: false, message: 'Analysis not found' };
    }

    // Cannot save if locked
    if (analysis.status === 'LOCKED') {
      return { success: false, message: 'Cannot save locked analysis' };
    }

    // Compute results
    const results = CalculationEngine.computeAnalysis(inputs);

    // Update analysis
    analysis.status = 'SAVED';
    analysis.saved_at = new Date().toISOString();
    analysis.updated_at = new Date().toISOString();
    analysis.title = title;

    // Store inputs and results
    inputs.analysis_id = analysisId;
    inputsStore.set(analysisId, inputs);
    results.analysis_id = analysisId;
    resultsStore.set(analysisId, results);

    analysisStore.set(analysisId, analysis);

    return {
      success: true,
      analysis,
      message: 'Analysis saved successfully',
    };
  }

  /**
   * Update LIVE analysis inputs (recompute on change)
   */
  static updateLiveAnalysis(analysisId: string, inputs: Partial<AnalysisInputs>, user: User): {
    success: boolean;
    results?: AnalysisComputedResults;
    message: string;
  } {
    const analysis = this.getAnalysis(analysisId, user);
    if (!analysis) {
      return { success: false, message: 'Analysis not found' };
    }

    // Cannot update if locked
    if (analysis.status === 'LOCKED') {
      return { success: false, message: 'Cannot update locked analysis' };
    }

    // Get existing inputs or create new
    let currentInputs = inputsStore.get(analysisId);
    if (!currentInputs) {
      currentInputs = {
        analysis_id: analysisId,
        mstr_license_per_instance: 0,
        ancillary_license_pct: 0,
        instance_count: 0,
        hosting_environment: 'AWS',
        tier_selections: {},
        storage_gb: 0,
        egress_gb: 0,
        compute_gb: 0,
        infrastructure_gb: 0,
        cloud_personnel_cost: 0,
        mstr_support_cost: 0,
      };
    }

    // Merge updates
    const updatedInputs: AnalysisInputs = {
      ...currentInputs,
      ...inputs,
      analysis_id: analysisId,
    };

    // Recompute results
    const results = CalculationEngine.computeAnalysis(updatedInputs);

    // Store
    inputsStore.set(analysisId, updatedInputs);
    resultsStore.set(analysisId, results);
    analysis.updated_at = new Date().toISOString();
    analysisStore.set(analysisId, analysis);

    return {
      success: true,
      results,
      message: 'Analysis updated',
    };
  }

  /**
   * Lock analysis (transition from SAVED to LOCKED)
   */
  static lockAnalysis(analysisId: string, user: User): { success: boolean; analysis?: Analysis; message: string } {
    const analysis = this.getAnalysis(analysisId, user);
    if (!analysis) {
      return { success: false, message: 'Analysis not found' };
    }

    // Only SAVED analyses can be locked
    if (analysis.status !== 'SAVED') {
      return { success: false, message: 'Only saved analyses can be locked' };
    }

    // Lock
    analysis.status = 'LOCKED';
    analysis.locked_at = new Date().toISOString();
    analysis.updated_at = new Date().toISOString();
    analysisStore.set(analysisId, analysis);

    return {
      success: true,
      analysis,
      message: 'Analysis locked successfully',
    };
  }

  /**
   * Unlock analysis (admin only)
   */
  static unlockAnalysis(analysisId: string, user: User): { success: boolean; analysis?: Analysis; message: string } {
    if (user.role !== 'ADMIN') {
      return { success: false, message: 'Only admins can unlock analyses' };
    }

    const analysis = this.getAnalysis(analysisId, user);
    if (!analysis) {
      return { success: false, message: 'Analysis not found' };
    }

    // Only LOCKED analyses can be unlocked
    if (analysis.status !== 'LOCKED') {
      return { success: false, message: 'Analysis is not locked' };
    }

    // Unlock (revert to SAVED)
    analysis.status = 'SAVED';
    analysis.locked_at = null;
    analysis.updated_at = new Date().toISOString();
    analysisStore.set(analysisId, analysis);

    return {
      success: true,
      analysis,
      message: 'Analysis unlocked successfully',
    };
  }

  /**
   * Get analysis inputs
   */
  static getInputs(analysisId: string, user: User): AnalysisInputs | null {
    const analysis = this.getAnalysis(analysisId, user);
    if (!analysis) return null;

    return inputsStore.get(analysisId) || null;
  }

  /**
   * Get analysis results
   */
  static getResults(analysisId: string, user: User): AnalysisComputedResults | null {
    const analysis = this.getAnalysis(analysisId, user);
    if (!analysis) return null;

    return resultsStore.get(analysisId) || null;
  }

  /**
   * Compute results for LIVE analysis (on input change)
   */
  static computeLiveResults(inputs: AnalysisInputs): AnalysisComputedResults {
    return CalculationEngine.computeAnalysis(inputs);
  }
}

