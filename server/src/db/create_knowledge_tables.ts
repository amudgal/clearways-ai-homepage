// Migration script to create knowledge storage tables
import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

async function createKnowledgeTables() {
  try {
    const sqlPath = join(__dirname, 'create_knowledge_tables.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Execute SQL
    await pool.query(sql);
    
    console.log('✅ Knowledge tables created successfully');
    console.log('   - contractor_knowledge: Stores contractor data');
    console.log('   - email_knowledge: Stores discovered emails');
    console.log('   - source_knowledge: Tracks source effectiveness');
  } catch (error) {
    console.error('❌ Error creating knowledge tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createKnowledgeTables();

