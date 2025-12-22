// Prisma Client Configuration
// Prisma 7+ requires passing the database URL via adapter or accelerateUrl
// The connection URL is read from DATABASE_URL environment variable

import { PrismaClient } from '@prisma/client';
import { PrismaPostgres } from '@prisma/adapter-postgres';
import { Pool } from 'pg';

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'clearways_ai'}?sslmode=${process.env.DB_SSL === 'true' ? 'require' : 'prefer'}`;

// Create PostgreSQL connection pool
const pool = new Pool({ connectionString: databaseUrl });

// Create Prisma adapter
const adapter = new PrismaPostgres(pool);

// Initialize Prisma Client with adapter
export const prisma = new PrismaClient({
  adapter: adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

