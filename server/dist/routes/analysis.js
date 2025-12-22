"use strict";
// Analysis Routes
// CRUD operations for analyses with tenant isolation
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const calculationService_1 = require("../services/calculationService");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Get all analyses for current user's tenant
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        const isAdmin = req.user.role === 'ADMIN';
        let query = `
      SELECT a.*, u.email as created_by_email, u.username as created_by_username, a.current_version_number
      FROM site_analyses a
      JOIN site_users u ON a.created_by = u.id
      WHERE 1=1
    `;
        const params = [];
        // Tenant isolation (unless admin)
        if (!isAdmin) {
            query += ' AND a.tenant_id = $1';
            params.push(tenantId);
        }
        query += ' ORDER BY a.updated_at DESC';
        const result = await database_1.pool.query(query, params);
        res.json({ analyses: result.rows });
    }
    catch (error) {
        console.error('Get analyses error:', error);
        res.status(500).json({ error: 'Failed to fetch analyses' });
    }
});
// Get single analysis (optionally with version)
router.get('/:id', auth_1.enforceTenantIsolation, async (req, res) => {
    try {
        const { id } = req.params;
        const versionNumber = req.query.version ? parseInt(req.query.version) : null;
        // Get analysis
        const analysisResult = await database_1.pool.query('SELECT * FROM site_analyses WHERE id = $1', [id]);
        if (analysisResult.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        const analysis = analysisResult.rows[0];
        // Get inputs
        const inputsResult = await database_1.pool.query('SELECT * FROM site_analysis_inputs WHERE analysis_id = $1', [id]);
        // Get results
        const resultsResult = await database_1.pool.query('SELECT * FROM site_analysis_computed_results WHERE analysis_id = $1 ORDER BY computed_at DESC LIMIT 1', [id]);
        // Get editable content from version
        let editableContent = null;
        if (versionNumber) {
            const versionResult = await database_1.pool.query('SELECT editable_content FROM site_analysis_versions WHERE analysis_id = $1 AND version_number = $2', [id, versionNumber]);
            if (versionResult.rows.length > 0) {
                editableContent = versionResult.rows[0].editable_content;
            }
        }
        else if (analysis.current_version_number) {
            // Get latest saved version
            const versionResult = await database_1.pool.query('SELECT editable_content FROM site_analysis_versions WHERE analysis_id = $1 AND version_number = $2', [id, analysis.current_version_number]);
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
    }
    catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({ error: 'Failed to fetch analysis' });
    }
});
// Get all versions for an analysis
router.get('/:id/versions', auth_1.enforceTenantIsolation, async (req, res) => {
    try {
        const { id } = req.params;
        const versionsResult = await database_1.pool.query(`SELECT v.version_number, v.created_at, u.email as created_by_email
       FROM site_analysis_versions v
       JOIN site_users u ON v.created_by = u.id
       WHERE v.analysis_id = $1
       ORDER BY v.version_number DESC`, [id]);
        res.json({ versions: versionsResult.rows });
    }
    catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({ error: 'Failed to fetch versions' });
    }
});
// Copy specific editable content fields from one version to another
router.post('/:id/copy-version-data', auth_1.enforceTenantIsolation, async (req, res) => {
    try {
        const { id } = req.params;
        const { sourceVersion, targetVersion, fields } = req.body;
        const userId = req.user.id;
        if (!sourceVersion || !targetVersion || !fields || !Array.isArray(fields)) {
            return res.status(400).json({ error: 'sourceVersion, targetVersion, and fields array are required' });
        }
        // Get source version data
        const sourceResult = await database_1.pool.query('SELECT editable_content FROM site_analysis_versions WHERE analysis_id = $1 AND version_number = $2', [id, sourceVersion]);
        if (sourceResult.rows.length === 0) {
            return res.status(404).json({ error: `Source version ${sourceVersion} not found` });
        }
        // Get target version data
        const targetResult = await database_1.pool.query('SELECT editable_content FROM site_analysis_versions WHERE analysis_id = $1 AND version_number = $2', [id, targetVersion]);
        if (targetResult.rows.length === 0) {
            return res.status(404).json({ error: `Target version ${targetVersion} not found` });
        }
        const sourceContent = sourceResult.rows[0].editable_content || {};
        const targetContent = targetResult.rows[0].editable_content || {};
        // Copy specified fields from source to target
        const updatedContent = { ...targetContent };
        for (const field of fields) {
            if (field === 'costRows') {
                // For costRows, only copy the architecture-choice-costs table, preserve other tables
                if (sourceContent.costRows && sourceContent.costRows['architecture-choice-costs']) {
                    updatedContent.costRows = {
                        ...(updatedContent.costRows || {}),
                        'architecture-choice-costs': sourceContent.costRows['architecture-choice-costs'],
                    };
                }
            }
            else if (sourceContent[field] !== undefined) {
                updatedContent[field] = sourceContent[field];
            }
        }
        // Update target version
        await database_1.pool.query('UPDATE site_analysis_versions SET editable_content = $1 WHERE analysis_id = $2 AND version_number = $3', [JSON.stringify(updatedContent), id, targetVersion]);
        res.json({
            success: true,
            message: `Copied fields ${fields.join(', ')} from version ${sourceVersion} to version ${targetVersion}`,
            updatedContent
        });
    }
    catch (error) {
        console.error('Copy version data error:', error);
        res.status(500).json({ error: 'Failed to copy version data' });
    }
});
// Delete all versions for an analysis
router.delete('/:id/versions', auth_1.enforceTenantIsolation, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        // Verify analysis exists and belongs to user's tenant
        const analysisResult = await database_1.pool.query('SELECT id, tenant_id FROM site_analyses WHERE id = $1', [id]);
        if (analysisResult.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        if (analysisResult.rows[0].tenant_id !== tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Delete all versions
        const deleteResult = await database_1.pool.query('DELETE FROM site_analysis_versions WHERE analysis_id = $1 RETURNING version_number', [id]);
        // Reset current_version_number to 0 (will start from 1 on next save)
        await database_1.pool.query('UPDATE site_analyses SET current_version_number = 0 WHERE id = $1', [id]);
        // Audit log
        await database_1.pool.query(`INSERT INTO site_audit_logs (user_id, tenant_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`, [
            userId,
            tenantId,
            'DELETE_ALL_VERSIONS',
            'analysis',
            id,
            JSON.stringify({ deleted_count: deleteResult.rows.length })
        ]);
        res.json({
            success: true,
            message: `Deleted ${deleteResult.rows.length} version(s) for analysis`,
            deletedCount: deleteResult.rows.length,
        });
    }
    catch (error) {
        console.error('Delete all versions error:', error);
        res.status(500).json({ error: 'Failed to delete versions' });
    }
});
// Create new LIVE analysis
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        const { analysis_type } = req.body;
        // Validate analysis_type if provided
        const validTypes = ['TCO', 'TIMELINE'];
        const finalAnalysisType = analysis_type && validTypes.includes(analysis_type)
            ? analysis_type
            : 'TCO'; // Default to TCO if not provided or invalid
        // Get active pricing version
        const pricingResult = await database_1.pool.query('SELECT id FROM site_pricing_versions WHERE is_active = true ORDER BY effective_date DESC LIMIT 1');
        if (pricingResult.rows.length === 0) {
            return res.status(400).json({ error: 'No active pricing version found' });
        }
        const pricingVersionId = pricingResult.rows[0].id;
        const result = await database_1.pool.query(`INSERT INTO site_analyses (tenant_id, status, created_by, pricing_version_id, analysis_type)
       VALUES ($1, 'LIVE', $2, $3, $4)
       RETURNING *`, [tenantId, userId, pricingVersionId, finalAnalysisType]);
        // Audit log
        await database_1.pool.query(`INSERT INTO site_audit_logs (user_id, tenant_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`, [userId, tenantId, 'CREATE_ANALYSIS', 'analysis', result.rows[0].id, JSON.stringify({ status: 'LIVE' })]);
        res.status(201).json({ analysis: result.rows[0] });
    }
    catch (error) {
        console.error('Create analysis error:', error);
        res.status(500).json({ error: 'Failed to create analysis' });
    }
});
// Update analysis inputs (recompute)
router.put('/:id/inputs', auth_1.enforceTenantIsolation, async (req, res) => {
    try {
        const { id } = req.params;
        const inputs = req.body;
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        // Validate ID is a valid UUID (not "new" or other invalid values)
        if (!id || id === 'new' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return res.status(400).json({ error: 'Invalid analysis ID' });
        }
        // Check analysis exists and is not locked
        const analysisResult = await database_1.pool.query('SELECT status, pricing_version_id FROM site_analyses WHERE id = $1', [id]);
        if (analysisResult.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        if (analysisResult.rows[0].status === 'LOCKED') {
            return res.status(400).json({ error: 'Cannot update a locked analysis' });
        }
        const pricingVersionId = analysisResult.rows[0].pricing_version_id;
        // Start transaction
        await database_1.pool.query('BEGIN');
        try {
            // Insert or update inputs
            await database_1.pool.query(`INSERT INTO site_analysis_inputs (
          analysis_id, mstr_license_per_instance, ancillary_license_pct, instance_count,
          hosting_environment, tier_selections, storage_gb, egress_gb, compute_gb,
          infrastructure_gb, cloud_personnel_cost, mstr_support_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (analysis_id) DO UPDATE SET
          mstr_license_per_instance = EXCLUDED.mstr_license_per_instance,
          ancillary_license_pct = EXCLUDED.ancillary_license_pct,
          instance_count = EXCLUDED.instance_count,
          hosting_environment = EXCLUDED.hosting_environment,
          tier_selections = EXCLUDED.tier_selections,
          storage_gb = EXCLUDED.storage_gb,
          egress_gb = EXCLUDED.egress_gb,
          compute_gb = EXCLUDED.compute_gb,
          infrastructure_gb = EXCLUDED.infrastructure_gb,
          cloud_personnel_cost = EXCLUDED.cloud_personnel_cost,
          mstr_support_cost = EXCLUDED.mstr_support_cost`, [
                id,
                inputs.mstr_license_per_instance,
                inputs.ancillary_license_pct,
                inputs.instance_count,
                inputs.hosting_environment,
                JSON.stringify(inputs.tier_selections || {}),
                inputs.storage_gb || 0,
                inputs.egress_gb || 0,
                inputs.compute_gb || 0,
                inputs.infrastructure_gb || 0,
                inputs.cloud_personnel_cost || 0,
                inputs.mstr_support_cost || 0,
            ]);
            // Recalculate results using CalculationService
            const calculationInputs = {
                mstr_license_per_instance: inputs.mstr_license_per_instance || 0,
                ancillary_license_pct: inputs.ancillary_license_pct || 0,
                instance_count: inputs.instance_count || 0,
                hosting_environment: inputs.hosting_environment,
                tier_selections: inputs.tier_selections || {},
                storage_gb: inputs.storage_gb || 0,
                egress_gb: inputs.egress_gb || 0,
                compute_gb: inputs.compute_gb || 0,
                infrastructure_gb: inputs.infrastructure_gb || 0,
                cloud_personnel_cost: inputs.cloud_personnel_cost || 0,
                mstr_support_cost: inputs.mstr_support_cost || 0,
            };
            const computedResults = await calculationService_1.CalculationService.computeAnalysis(calculationInputs, pricingVersionId);
            // Insert or update computed results using the correct table and schema
            await database_1.pool.query(`INSERT INTO site_analysis_computed_results (
          analysis_id, annualized_licensing, annualized_metered_costs, annualized_support_costs,
          total_cost, confidence_scores, sensitivity_ratings, cost_breakdown
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (analysis_id) DO UPDATE SET
          annualized_licensing = EXCLUDED.annualized_licensing,
          annualized_metered_costs = EXCLUDED.annualized_metered_costs,
          annualized_support_costs = EXCLUDED.annualized_support_costs,
          total_cost = EXCLUDED.total_cost,
          confidence_scores = EXCLUDED.confidence_scores,
          sensitivity_ratings = EXCLUDED.sensitivity_ratings,
          cost_breakdown = EXCLUDED.cost_breakdown,
          computed_at = CURRENT_TIMESTAMP`, [
                id,
                computedResults.annualized_licensing,
                computedResults.annualized_metered_costs,
                computedResults.annualized_support_costs,
                computedResults.total_cost,
                JSON.stringify(computedResults.confidence_scores),
                JSON.stringify(computedResults.sensitivity_ratings),
                JSON.stringify(computedResults.cost_breakdown),
            ]);
            await database_1.pool.query('COMMIT');
            // Return updated results
            const resultsResult = await database_1.pool.query('SELECT * FROM site_analysis_computed_results WHERE analysis_id = $1', [id]);
            res.json({ results: resultsResult.rows[0] });
        }
        catch (error) {
            await database_1.pool.query('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Update inputs error:', error);
        res.status(500).json({ error: 'Failed to update analysis inputs' });
    }
});
// Save analysis (create new version)
router.post('/:id/save', auth_1.enforceTenantIsolation, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, editable_content } = req.body;
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        // Validate ID is a valid UUID (not "new" or other invalid values)
        if (!id || id === 'new' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return res.status(400).json({ error: 'Invalid analysis ID' });
        }
        // Get current analysis to determine version number and status
        const analysisResult = await database_1.pool.query('SELECT current_version_number, status FROM site_analyses WHERE id = $1', [id]);
        if (analysisResult.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        const currentStatus = analysisResult.rows[0].status;
        // Don't allow saving if analysis is locked
        if (currentStatus === 'LOCKED') {
            return res.status(400).json({ error: 'Cannot save a locked analysis' });
        }
        const currentVersion = analysisResult.rows[0].current_version_number || 0;
        // If current_version_number is 0 or NULL, start from version 1
        const newVersionNumber = currentVersion === 0 ? 1 : currentVersion + 1;
        // Start transaction
        await database_1.pool.query('BEGIN');
        try {
            // Update analysis status and version (allow saving from LIVE or SAVED status)
            const result = await database_1.pool.query(`UPDATE site_analyses 
         SET status = 'SAVED', saved_at = COALESCE(saved_at, CURRENT_TIMESTAMP), title = $1, 
             current_version_number = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND status IN ('LIVE', 'SAVED')
         RETURNING *`, [title || 'Untitled Analysis', newVersionNumber, id]);
            if (result.rows.length === 0) {
                await database_1.pool.query('ROLLBACK');
                return res.status(400).json({ error: 'Analysis not found or cannot be saved' });
            }
            // Create new version with editable content
            if (editable_content) {
                // Log what we're receiving for debugging
                console.log('Saving editable_content to database:', JSON.stringify(editable_content, null, 2));
                console.log('Timeline data:', editable_content.timelineData);
                // editable_content should already be an object, not a string
                // PostgreSQL JSONB column accepts objects directly
                await database_1.pool.query(`INSERT INTO site_analysis_versions (analysis_id, version_number, editable_content, created_by)
           VALUES ($1, $2, $3, $4)`, [id, newVersionNumber, JSON.stringify(editable_content), userId]);
                // Verify what was saved
                const verifyResult = await database_1.pool.query(`SELECT editable_content FROM site_analysis_versions WHERE analysis_id = $1 AND version_number = $2`, [id, newVersionNumber]);
                if (verifyResult.rows.length > 0) {
                    console.log('Verified saved content:', JSON.stringify(verifyResult.rows[0].editable_content, null, 2));
                }
            }
            await database_1.pool.query('COMMIT');
            // Audit log
            await database_1.pool.query(`INSERT INTO site_audit_logs (user_id, tenant_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`, [userId, tenantId, 'SAVE_ANALYSIS', 'analysis', id, JSON.stringify({ title, version: newVersionNumber })]);
            res.json({ analysis: result.rows[0], version: newVersionNumber });
        }
        catch (error) {
            await database_1.pool.query('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Save analysis error:', error);
        res.status(500).json({ error: 'Failed to save analysis' });
    }
});
exports.default = router;
//# sourceMappingURL=analysis.js.map