// Admin Routes
// Pricing management and admin operations

import express from 'express';
import { pool } from '../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All routes require admin access
router.use(authenticate);
router.use(requireAdmin);

// Get all pricing versions
router.get('/pricing/versions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pv.*, u.email as created_by_email
       FROM site_pricing_versions pv
       LEFT JOIN site_users u ON pv.created_by = u.id
       ORDER BY pv.effective_date DESC`
    );

    res.json({ versions: result.rows });
  } catch (error) {
    console.error('Get pricing versions error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing versions' });
  }
});

// Create new pricing version (auto-generated with timestamp)
router.post('/pricing/versions', async (req: AuthRequest, res) => {
  try {
    const { version, effective_date } = req.body;
    const userId = req.user!.id;

    // Auto-generate version name with timestamp if not provided
    let versionName = version;
    let effectiveDate = effective_date;

    if (!versionName) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      versionName = `v${timestamp}`;
    }

    if (!effectiveDate) {
      effectiveDate = new Date().toISOString().split('T')[0];
    }

    // Deactivate all other versions
    await pool.query(
      'UPDATE site_pricing_versions SET is_active = false'
    );

    const result = await pool.query(
      `INSERT INTO site_pricing_versions (version, effective_date, created_by, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [versionName, effectiveDate, userId]
    );

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'CREATE_PRICING_VERSION', 'pricing_version', result.rows[0].id, JSON.stringify({ version: versionName })]
    );

    res.status(201).json({ version: result.rows[0] });
  } catch (error) {
    console.error('Create pricing version error:', error);
    res.status(500).json({ error: 'Failed to create pricing version' });
  }
});

// Get pricing data for a version and provider
router.get('/pricing/:versionId/:provider', async (req, res) => {
  try {
    const { versionId, provider } = req.params;

    if (!['AWS', 'GCP', 'Azure'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const result = await pool.query(
      `SELECT id, service_type, tier, region, unit_type, unit_price, annual_multiplier, metadata
       FROM site_cloud_pricing
       WHERE pricing_version_id = $1 AND provider = $2
       ORDER BY service_type, tier`,
      [versionId, provider]
    );

    res.json({ pricing: result.rows });
  } catch (error) {
    console.error('Get pricing data error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing data' });
  }
});

// Create or update pricing entry
router.post('/pricing', async (req: AuthRequest, res) => {
  try {
    const {
      pricing_version_id,
      provider,
      service_type,
      tier,
      region,
      unit_type,
      unit_price,
      annual_multiplier,
      metadata,
    } = req.body;

    if (!pricing_version_id || !provider || !service_type || !unit_type || unit_price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['AWS', 'GCP', 'Azure'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (!['hourly', 'gb_month', 'gb', 'percentage'].includes(unit_type)) {
      return res.status(400).json({ error: 'Invalid unit_type' });
    }

    // Ensure unit_price is a number, not a string
    const priceValue = typeof unit_price === 'string' ? parseFloat(unit_price) : Number(unit_price);
    const multiplierValue = typeof annual_multiplier === 'string' ? parseFloat(annual_multiplier) : Number(annual_multiplier || 1.0);

    if (isNaN(priceValue) || priceValue < 0) {
      return res.status(400).json({ error: 'Invalid unit_price value. Must be a non-negative number.' });
    }

    if (isNaN(multiplierValue) || multiplierValue < 0) {
      return res.status(400).json({ error: 'Invalid annual_multiplier value. Must be a non-negative number.' });
    }

    // Try to update first, then insert if no rows were updated
    const updateResult = await pool.query(
      `UPDATE site_cloud_pricing
       SET unit_price = $1, 
           annual_multiplier = $2, 
           metadata = $3,
           tier = $4,
           region = $5
       WHERE pricing_version_id = $6 AND provider = $7 AND service_type = $8
       RETURNING *`,
      [
        priceValue,
        multiplierValue,
        metadata ? JSON.stringify(metadata) : null,
        tier || null,
        region || null,
        pricing_version_id,
        provider,
        service_type,
      ]
    );

    if (updateResult.rows.length > 0) {
      // Audit log
      await pool.query(
        `INSERT INTO site_audit_logs (user_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user!.id,
          'UPDATE_PRICING',
          'cloud_pricing',
          updateResult.rows[0].id,
          JSON.stringify({ provider, service_type, unit_price: priceValue }),
        ]
      );

      return res.json({ pricing: updateResult.rows[0] });
    }

    // No existing record, insert new one
    const result = await pool.query(
      `INSERT INTO site_cloud_pricing (
        pricing_version_id, provider, service_type, tier, region,
        unit_type, unit_price, annual_multiplier, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        pricing_version_id,
        provider,
        service_type,
        tier || null,
        region || null,
        unit_type,
        priceValue,
        multiplierValue,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user!.id,
        'CREATE_PRICING',
        'cloud_pricing',
        result.rows[0].id,
        JSON.stringify({ provider, service_type, unit_price: priceValue }),
      ]
    );

    res.status(201).json({ pricing: result.rows[0] });
  } catch (error) {
    console.error('Create pricing error:', error);
    res.status(500).json({ error: 'Failed to create pricing entry' });
  }
});

// Delete pricing entry
router.delete('/pricing/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM site_cloud_pricing WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing entry not found' });
    }

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user!.id, 'DELETE_PRICING', 'cloud_pricing', id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete pricing error:', error);
    res.status(500).json({ error: 'Failed to delete pricing entry' });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT al.*, u.email as user_email, t.name as tenant_name
       FROM site_audit_logs al
       LEFT JOIN site_users u ON al.user_id = u.id
       LEFT JOIN site_tenants t ON al.tenant_id = t.id
       ORDER BY al.timestamp DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit as string), parseInt(offset as string)]
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ========== TENANT MANAGEMENT ROUTES ==========

// Get all tenants
router.get('/tenants', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
       COUNT(DISTINCT u.id) as user_count,
       COUNT(DISTINCT a.id) as analysis_count
       FROM site_tenants t
       LEFT JOIN site_users u ON t.id = u.tenant_id
       LEFT JOIN site_analyses a ON t.id = a.tenant_id
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    );

    res.json({ tenants: result.rows });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get single tenant
router.get('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, 
       COUNT(DISTINCT u.id) as user_count,
       COUNT(DISTINCT a.id) as analysis_count
       FROM site_tenants t
       LEFT JOIN site_users u ON t.id = u.tenant_id
       LEFT JOIN site_analyses a ON t.id = a.tenant_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ tenant: result.rows[0] });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Create new tenant (onboard new client)
router.post('/tenants', async (req: AuthRequest, res) => {
  try {
    const { name, domain, status = 'ACTIVE' } = req.body;
    const userId = req.user!.id;

    if (!name || !domain) {
      return res.status(400).json({ error: 'Name and domain are required' });
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Check if domain already exists
    const existingResult = await pool.query(
      'SELECT id FROM site_tenants WHERE domain = $1',
      [domain.toLowerCase()]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Domain already exists' });
    }

    // Block personal email domains
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    if (personalDomains.includes(domain.toLowerCase())) {
      return res.status(400).json({ error: 'Personal email domains are not allowed' });
    }

    const result = await pool.query(
      `INSERT INTO site_tenants (name, domain, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, domain.toLowerCase(), status]
    );

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'CREATE_TENANT',
        'tenant',
        result.rows[0].id,
        JSON.stringify({ name, domain: domain.toLowerCase() }),
      ]
    );

    res.status(201).json({ tenant: result.rows[0] });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Update tenant
router.put('/tenants/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, domain, status } = req.body;
    const userId = req.user!.id;

    // Check if tenant exists
    const existingResult = await pool.query(
      'SELECT * FROM site_tenants WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(name);
    }

    if (domain !== undefined) {
      // Validate domain format
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
      if (!domainRegex.test(domain)) {
        return res.status(400).json({ error: 'Invalid domain format' });
      }

      // Check if domain already exists (excluding current tenant)
      const domainCheck = await pool.query(
        'SELECT id FROM site_tenants WHERE domain = $1 AND id != $2',
        [domain.toLowerCase(), id]
      );

      if (domainCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Domain already exists' });
      }

      updates.push(`domain = $${paramCount++}`);
      params.push(domain.toLowerCase());
    }

    if (status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE site_tenants 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'UPDATE_TENANT',
        'tenant',
        id,
        JSON.stringify({ name, domain, status }),
      ]
    );

    res.json({ tenant: result.rows[0] });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Delete tenant (soft delete by setting status to INACTIVE)
router.delete('/tenants/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if tenant exists
    const existingResult = await pool.query(
      'SELECT * FROM site_tenants WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Don't allow deleting ClearWays AI tenant
    if (existingResult.rows[0].domain === 'clearways.ai') {
      return res.status(400).json({ error: 'Cannot delete ClearWays AI tenant' });
    }

    // Soft delete by setting status to INACTIVE
    const result = await pool.query(
      `UPDATE site_tenants 
       SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'DELETE_TENANT', 'tenant', id]
    );

    res.json({ tenant: result.rows[0] });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

export default router;

