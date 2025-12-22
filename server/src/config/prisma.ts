// Prisma Client Configuration
// Prisma 7+ requires using an adapter for database connections
// Using @prisma/adapter-pg for PostgreSQL

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Get DATABASE_URL from environment
// This should point to your existing PostgreSQL database
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in your .env file to point to your existing PostgreSQL database.');
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

