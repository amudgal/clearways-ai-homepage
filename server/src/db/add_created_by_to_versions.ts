import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function addCreatedByToVersions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sqlPath = path.join(__dirname, 'add_created_by_to_versions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    await client.query('COMMIT');
    console.log('✅ Successfully added created_by column to site_analysis_versions');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding created_by column:', error);
    throw error;
  } finally {
    client.release();
  }
}

addCreatedByToVersions()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

