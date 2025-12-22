#!/usr/bin/env tsx
// Script to introspect the users table structure

import '../src/config/buildDatabaseUrl';
import { pool } from '../src/config/database';

async function introspectUsersTable() {
  try {
    // Get table structure
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Users table structure:');
    console.log(JSON.stringify(result.rows, null, 2));

    // Get constraints
    const constraints = await pool.query(`
      SELECT
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'users';
    `);

    console.log('\nConstraints:');
    console.log(JSON.stringify(constraints.rows, null, 2));

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

introspectUsersTable();

