// Analysis Routes
// CRUD operations for analyses with tenant isolation

import express from 'express';
import { pool } from '../config/database';
import { authenticate, enforceTenantIsolation, AuthRequest } from '../middleware/auth';
import { CalculationService } from '../services/calculationService';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all analyses for current user's tenant
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenant_id;
    const isAdmin = req.user!.role === 'ADMIN';

    let query = `
      SELECT a.*, u.email as created_by_email, a.current_version_number
      FROM site_analyses a
      JOIN site_users u ON a.created_by = u.id
      WHERE a.status != 'LIVE'
    `;

    const params: any[] = [];
    
    // Tenant isolation (unless admin)
    if (!isAdmin) {
      query += ' AND a.tenant_id = $1';
      params.push(tenantId);
    }

    query += ' ORDER BY a.updated_at DESC';

    const result = await pool.query(query, params);
    res.json({ analyses: result.rows });
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// Get single analysis (optionally with version)
router.get('/:id', enforceTenantIsolation, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const versionNumber = req.query.version ? parseInt(req.query.version as string) : null;

    const analysisResult = await pool.query(
      `SELECT a.*, u.email as created_by_email
       FROM site_analyses a
       JOIN site_users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const analysis = analysisResult.rows[0];

    // Get inputs
    const inputsResult = await pool.query(
      'SELECT * FROM site_analysis_inputs WHERE analysis_id = $1',
      [id]
    );

    // Get results
    const resultsResult = await pool.query(
      'SELECT * FROM site_analysis_computed_results WHERE analysis_id = $1',
      [id]
    );

    // Get version (latest if no version specified, or specific version)
    let editableContent = null;
    if (versionNumber) {
      const versionResult = await pool.query(
        'SELECT editable_content FROM site_analysis_versions WHERE analysis_id = $1 AND version_number = $2',
        [id, versionNumber]
      );
      if (versionResult.rows.length > 0) {
        editableContent = versionResult.rows[0].editable_content;
      }
    } else if (analysis.current_version_number) {
      // Get latest version
      const versionResult = await pool.query(
        'SELECT editable_content FROM site_analysis_versions WHERE analysis_id = $1 AND version_number = $2',
        [id, analysis.current_version_number]
      );
      if (versionResult.rows.length > 0) {
        editableContent = versionResult.rows[0].editable_content;
      }
    }

    res.json({
      analysis,
      inputs: inputsResult.rows[0] || null,
      results: resultsResult.rows[0] || null,
      editableContent,
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// Get all versions for an analysis
router.get('/:id/versions', enforceTenantIsolation, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const versionsResult = await pool.query(
      `SELECT v.version_number, v.created_at, u.email as created_by_email
       FROM site_analysis_versions v
       JOIN site_users u ON v.created_by = u.id
       WHERE v.analysis_id = $1
       ORDER BY v.version_number DESC`,
      [id]
    );

    res.json({ versions: versionsResult.rows });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// Create new LIVE analysis
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenant_id;

    // Get active pricing version
    const pricingResult = await pool.query(
      'SELECT id FROM site_pricing_versions WHERE is_active = true ORDER BY effective_date DESC LIMIT 1'
    );

    if (pricingResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active pricing version found' });
    }

    const pricingVersionId = pricingResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO site_analyses (tenant_id, status, created_by, pricing_version_id)
       VALUES ($1, 'LIVE', $2, $3)
       RETURNING *`,
      [tenantId, userId, pricingVersionId]
    );

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, tenant_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, tenantId, 'CREATE_ANALYSIS', 'analysis', result.rows[0].id, JSON.stringify({ status: 'LIVE' })]
    );

    res.status(201).json({ analysis: result.rows[0] });
  } catch (error) {
    console.error('Create analysis error:', error);
    res.status(500).json({ error: 'Failed to create analysis' });
  }
});

// Update analysis inputs (recompute)
router.put('/:id/inputs', enforceTenantIsolation, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const inputs = req.body;
    const userId = req.user!.id;
    const tenantId = req.user!.tenant_id;

    // Validate ID is a valid UUID (not "new" or other invalid values)
    if (!id || id === 'new' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid analysis ID' });
    }

    // Check analysis exists and is not locked
    const analysisResult = await pool.query(
      'SELECT status, pricing_version_id FROM site_analyses WHERE id = $1',
      [id]
    );

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysisResult.rows[0].status === 'LOCKED') {
      return res.status(400).json({ error: 'Cannot update locked analysis' });
    }

    const pricingVersionId = analysisResult.rows[0].pricing_version_id;

    // Upsert inputs
    await pool.query(
      `INSERT INTO site_analysis_inputs (
        analysis_id, mstr_license_per_instance, ancillary_license_pct, instance_count,
        hosting_environment, tier_selections, storage_gb, egress_gb, compute_gb,
        infrastructure_gb, cloud_personnel_cost, mstr_support_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (analysis_id) DO UPDATE SET
        mstr_license_per_instance = $2,
        ancillary_license_pct = $3,
        instance_count = $4,
        hosting_environment = $5,
        tier_selections = $6,
        storage_gb = $7,
        egress_gb = $8,
        compute_gb = $9,
        infrastructure_gb = $10,
        cloud_personnel_cost = $11,
        mstr_support_cost = $12`,
      [
        id,
        inputs.mstr_license_per_instance || 0,
        inputs.ancillary_license_pct || 0,
        inputs.instance_count || 0,
        inputs.hosting_environment || 'AWS',
        JSON.stringify(inputs.tier_selections || {}),
        inputs.storage_gb || 0,
        inputs.egress_gb || 0,
        inputs.compute_gb || 0,
        inputs.infrastructure_gb || 0,
        inputs.cloud_personnel_cost || 0,
        inputs.mstr_support_cost || 0,
      ]
    );

    // Recompute results
    const calculationInputs = {
      mstr_license_per_instance: inputs.mstr_license_per_instance || 0,
      ancillary_license_pct: inputs.ancillary_license_pct || 0,
      instance_count: inputs.instance_count || 0,
      hosting_environment: inputs.hosting_environment || 'AWS',
      tier_selections: inputs.tier_selections || {},
      storage_gb: inputs.storage_gb || 0,
      egress_gb: inputs.egress_gb || 0,
      compute_gb: inputs.compute_gb || 0,
      infrastructure_gb: inputs.infrastructure_gb || 0,
      cloud_personnel_cost: inputs.cloud_personnel_cost || 0,
      mstr_support_cost: inputs.mstr_support_cost || 0,
    };

    const results = await CalculationService.computeAnalysis(calculationInputs, pricingVersionId);

    // Upsert results
    await pool.query(
      `INSERT INTO site_analysis_computed_results (
        analysis_id, annualized_licensing, annualized_metered_costs, annualized_support_costs,
        total_cost, confidence_scores, sensitivity_ratings, cost_breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (analysis_id) DO UPDATE SET
        annualized_licensing = $2,
        annualized_metered_costs = $3,
        annualized_support_costs = $4,
        total_cost = $5,
        confidence_scores = $6,
        sensitivity_ratings = $7,
        cost_breakdown = $8,
        computed_at = CURRENT_TIMESTAMP`,
      [
        id,
        results.annualized_licensing,
        results.annualized_metered_costs,
        results.annualized_support_costs,
        results.total_cost,
        JSON.stringify(results.confidence_scores),
        JSON.stringify(results.sensitivity_ratings),
        JSON.stringify(results.cost_breakdown),
      ]
    );

    // Update analysis timestamp
    await pool.query(
      'UPDATE site_analyses SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ success: true, results });
  } catch (error) {
    console.error('Update inputs error:', error);
    res.status(500).json({ error: 'Failed to update analysis' });
  }
});

// Save analysis (LIVE -> SAVED) with versioning
router.post('/:id/save', enforceTenantIsolation, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, editable_content } = req.body;
    const userId = req.user!.id;
    const tenantId = req.user!.tenant_id;

    // Validate ID is a valid UUID (not "new" or other invalid values)
    if (!id || id === 'new' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid analysis ID' });
    }

    // Get current analysis to determine version number and status
    const analysisResult = await pool.query(
      'SELECT current_version_number, status FROM site_analyses WHERE id = $1',
      [id]
    );

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const currentStatus = analysisResult.rows[0].status;
    
    // Don't allow saving if analysis is locked
    if (currentStatus === 'LOCKED') {
      return res.status(400).json({ error: 'Cannot save a locked analysis' });
    }

    const currentVersion = analysisResult.rows[0].current_version_number || 0;
    const newVersionNumber = currentVersion + 1;

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update analysis status and version (allow saving from LIVE or SAVED status)
      const result = await pool.query(
        `UPDATE site_analyses 
         SET status = 'SAVED', saved_at = COALESCE(saved_at, CURRENT_TIMESTAMP), title = $1, 
             current_version_number = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND status IN ('LIVE', 'SAVED')
         RETURNING *`,
        [title || 'Untitled Analysis', newVersionNumber, id]
      );

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Analysis not found or cannot be saved' });
      }

      // Create new version with editable content
      if (editable_content) {
        await pool.query(
          `INSERT INTO site_analysis_versions (analysis_id, version_number, editable_content, created_by)
           VALUES ($1, $2, $3, $4)`,
          [id, newVersionNumber, JSON.stringify(editable_content), userId]
        );
      }

      await pool.query('COMMIT');

      // Audit log
      await pool.query(
        `INSERT INTO site_audit_logs (user_id, tenant_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, tenantId, 'SAVE_ANALYSIS', 'analysis', id, JSON.stringify({ title, version: newVersionNumber })]
      );

      res.json({ analysis: result.rows[0], version: newVersionNumber });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Save analysis transaction error:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Save analysis error:', error);
    // Return more specific error message if available
    if (error.message) {
      return res.status(500).json({ error: `Failed to save analysis: ${error.message}` });
    }
    res.status(500).json({ error: 'Failed to save analysis' });
  }
});

// Lock analysis (SAVED -> LOCKED)
router.post('/:id/lock', enforceTenantIsolation, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const tenantId = req.user!.tenant_id;

    const result = await pool.query(
      `UPDATE site_analyses 
       SET status = 'LOCKED', locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'SAVED'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Analysis not found or cannot be locked' });
    }

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, tenant_id, action, target_type, target_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tenantId, 'LOCK_ANALYSIS', 'analysis', id]
    );

    res.json({ analysis: result.rows[0] });
  } catch (error) {
    console.error('Lock analysis error:', error);
    res.status(500).json({ error: 'Failed to lock analysis' });
  }
});

// Unlock analysis (admin only)
router.post('/:id/unlock', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const userId = req.user!.id;

    const result = await pool.query(
      `UPDATE site_analyses 
       SET status = 'SAVED', locked_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'LOCKED'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Analysis not found or cannot be unlocked' });
    }

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'UNLOCK_ANALYSIS', 'analysis', id, JSON.stringify({ admin_action: true })]
    );

    res.json({ analysis: result.rows[0] });
  } catch (error) {
    console.error('Unlock analysis error:', error);
    res.status(500).json({ error: 'Failed to unlock analysis' });
  }
});

export default router;

