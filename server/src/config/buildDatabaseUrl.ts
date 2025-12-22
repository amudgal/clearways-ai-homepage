// Helper to build DATABASE_URL from DB_* environment variables
// This ensures DATABASE_URL is set before Prisma reads it

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath, override: false });
  if (!result.error) break;
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
}

export {};

