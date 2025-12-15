// Database Migration Script
// Run this to set up the database schema

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    
    // Insert default tenant for ClearWays AI
    await pool.query(`
      INSERT INTO site_tenants (name, domain, status)
      VALUES ('Clear Ways AI', 'clearways.ai', 'ACTIVE')
      ON CONFLICT (domain) DO NOTHING
    `);
    
    // Insert default tenant for American Express
    await pool.query(`
      INSERT INTO site_tenants (name, domain, status)
      VALUES ('American Express', 'aexp.com', 'ACTIVE')
      ON CONFLICT (domain) DO NOTHING
    `);
    
    console.log('✅ Default tenants created');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

