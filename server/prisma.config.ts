// Prisma Configuration for Prisma 7+
// Connection URLs are now configured here instead of in schema.prisma
// Uses the existing PostgreSQL database configured via DB_* variables or DATABASE_URL

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Use DATABASE_URL from environment, or construct from existing DB_* variables
// This matches the database configuration in database.ts
const databaseUrl = env('DATABASE_URL') || 
  (env('DB_HOST') && env('DB_NAME') && env('DB_USER')
    ? `postgresql://${env('DB_USER')}:${encodeURIComponent(env('DB_PASSWORD') || '')}@${env('DB_HOST')}:${env('DB_PORT') || '5432'}/${env('DB_NAME')}${env('DB_SSL') === 'true' ? '?sslmode=require' : ''}`
    : null);

if (!databaseUrl) {
  throw new Error('Database configuration required. Please set either DATABASE_URL or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in your .env file to point to your existing PostgreSQL database.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});

