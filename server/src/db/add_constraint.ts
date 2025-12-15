// Migration script to add UNIQUE constraint to site_cloud_pricing
// Run this after the initial migration if the table already exists

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

async function addConstraint() {
  try {
    console.log('🔄 Adding UNIQUE constraint to site_cloud_pricing...');
    
    // Read constraint SQL file
    const constraintPath = join(__dirname, 'add_unique_constraint.sql');
    const constraintSQL = readFileSync(constraintPath, 'utf-8');
    
    // Execute constraint SQL
    await pool.query(constraintSQL);
    
    console.log('✅ UNIQUE constraint added successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add constraint:', error);
    process.exit(1);
  }
}

addConstraint();

