// Migration script to add credential-based user authentication
// Run with: npm run migrate (or tsx src/db/add_credential_users.ts)

import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  try {
    console.log('Starting migration: Add credential-based user authentication...');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'add_credential_users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute SQL
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Added fields: username, password_hash to site_users table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();

