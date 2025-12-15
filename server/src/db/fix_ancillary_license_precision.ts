import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST?.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : false,
});

async function fixAncillaryLicensePrecision() {
  try {
    const sqlPath = path.join(__dirname, 'fix_ancillary_license_precision.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    console.log('✅ Successfully updated ancillary_license_pct column precision');
  } catch (error) {
    console.error('❌ Error updating column:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAncillaryLicensePrecision();

