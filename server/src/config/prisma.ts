// Prisma Client Configuration
// Prisma 7+ requires using an adapter for database connections
// Using @prisma/adapter-pg for PostgreSQL

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Get DATABASE_URL from environment or construct from existing DB_* variables
// Uses the same database configuration as database.ts (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)
const databaseUrl = process.env.DATABASE_URL || 
  (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER
    ? `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}${process.env.DB_SSL === 'true' ? '?sslmode=require' : ''}`
    : null);

if (!databaseUrl) {
  throw new Error('Database configuration required. Please set either DATABASE_URL or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in your .env file to point to your existing PostgreSQL database.');
}

// Create PostgreSQL connection pool
const pool = new Pool({ connectionString: databaseUrl });

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

