// Helper to build DATABASE_URL from DB_* environment variables
// This ensures DATABASE_URL is set before Prisma reads it
// This file should be imported/required before any Prisma CLI commands

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath, override: false });
  if (!result.error) {
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config(); // Try default location
}

// Build DATABASE_URL from DB_* variables if not already set
if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER) {
  const password = encodeURIComponent(process.env.DB_PASSWORD || '');
  const port = process.env.DB_PORT || '5432';
  const sslMode = process.env.DB_SSL === 'true' ? '?sslmode=require' : '';
  
  process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${password}@${process.env.DB_HOST}:${port}/${process.env.DB_NAME}${sslMode}`;
  
  console.log('✅ Constructed DATABASE_URL from DB_* variables');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);
} else if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL from environment');
}

// Export the DATABASE_URL so it's available
export const DATABASE_URL = process.env.DATABASE_URL;

