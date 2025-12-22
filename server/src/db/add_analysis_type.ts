// Migration script to add analysis_type to site_analyses table
// Run with: npm run add-analysis-type (or tsx src/db/add_analysis_type.ts)

import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  try {
    console.log('Starting migration: Add analysis_type to site_analyses...');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'add_analysis_type.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute SQL
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Added field: analysis_type to site_analyses table');
    console.log('Default value: TCO (for existing records)');
    console.log('Valid types: TCO, TIMELINE');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();

