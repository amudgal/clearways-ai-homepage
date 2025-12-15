// Pricing Routes
// Get pricing data (read-only for users)

import express from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get active pricing version
router.get('/version/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, version, effective_date, created_at
       FROM site_pricing_versions
       WHERE is_active = true
       ORDER BY effective_date DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active pricing version found' });
    }

    res.json({ pricingVersion: result.rows[0] });
  } catch (error) {
    console.error('Get pricing version error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing version' });
  }
});

// Get pricing data for a provider
router.get('/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!['AWS', 'GCP', 'Azure'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Get active pricing version
    const versionResult = await pool.query(
      'SELECT id FROM site_pricing_versions WHERE is_active = true ORDER BY effective_date DESC LIMIT 1'
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active pricing version found' });
    }

    const pricingVersionId = versionResult.rows[0].id;

    const result = await pool.query(
      `SELECT service_type, tier, region, unit_type, unit_price, annual_multiplier, metadata
       FROM site_cloud_pricing
       WHERE pricing_version_id = $1 AND provider = $2
       ORDER BY service_type, tier`,
      [pricingVersionId, provider]
    );

    res.json({ pricing: result.rows });
  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing data' });
  }
});

export default router;

