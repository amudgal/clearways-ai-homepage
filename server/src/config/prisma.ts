// Prisma Client Configuration
// Prisma 7+ requires using an adapter for database connections
// Using @prisma/adapter-pg for PostgreSQL

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file first
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

// Build DATABASE_URL from DB_* variables if not set or pointing to localhost
const currentUrl = process.env.DATABASE_URL;
const isLocalhost = currentUrl && (
  currentUrl.includes('localhost') || 
  currentUrl.includes('127.0.0.1') ||
  currentUrl.includes('mydb')
);

// Get DATABASE_URL from environment or construct from existing DB_* variables
// Uses the same database configuration as database.ts (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)
const databaseUrl = (!currentUrl || isLocalhost) && process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER
  ? `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}${process.env.DB_SSL === 'true' ? '?sslmode=require' : ''}`
  : (currentUrl && !isLocalhost ? currentUrl : null);

if (!databaseUrl) {
  throw new Error('Database configuration required. Please set either DATABASE_URL or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in your .env file to point to your existing PostgreSQL database.');
}

// Create PostgreSQL connection pool with SSL configuration
// Match the SSL settings from database.ts
const poolConfig: any = {
  connectionString: databaseUrl,
};

// Configure SSL if DB_SSL is set to 'true'
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Accept self-signed certificates (needed for AWS RDS)
  };
}

const pool = new Pool(poolConfig);

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with adapter
export const prisma = new PrismaClient({
  adapter: adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

