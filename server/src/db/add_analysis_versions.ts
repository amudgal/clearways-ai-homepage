import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function addAnalysisVersions() {
  try {
    console.log('🔄 Adding analysis versions table...');
    const sql = readFileSync(join(__dirname, 'add_analysis_versions.sql'), 'utf-8');
    await pool.query(sql);
    console.log('✅ Successfully added analysis versions table');
  } catch (error) {
    console.error('❌ Error adding analysis versions table:', error);
  } finally {
    await pool.end();
  }
}

addAnalysisVersions();

