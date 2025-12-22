// Prisma Configuration for Prisma 7+
// Connection URLs are now configured here instead of in schema.prisma
// Uses the existing PostgreSQL database configured via DB_* variables or DATABASE_URL

import dotenv from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from 'prisma/config';

// Explicitly load .env file from server directory
dotenv.config({ path: resolve(__dirname, '../.env') });

// Use DATABASE_URL from environment, or construct from existing DB_* variables
// This matches the database configuration in database.ts
// Note: Use process.env directly as env() function may not work correctly
const databaseUrl = process.env.DATABASE_URL || 
  (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER
    ? `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}${process.env.DB_SSL === 'true' ? '?sslmode=require' : ''}`
    : null);

if (!databaseUrl) {
  console.error('❌ Database configuration missing!');
  console.error('Please set either:');
  console.error('  - DATABASE_URL (full connection string), or');
  console.error('  - DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD');
  console.error('Current values:', {
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    DB_HOST: process.env.DB_HOST || 'NOT SET',
    DB_NAME: process.env.DB_NAME || 'NOT SET',
    DB_USER: process.env.DB_USER || 'NOT SET',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT SET',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_SSL: process.env.DB_SSL || 'false',
  });
  throw new Error('Database configuration required. Please set either DATABASE_URL or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in your .env file to point to your existing PostgreSQL database.');
}

console.log('✅ Using existing database:', {
  host: process.env.DB_HOST || new URL(databaseUrl).hostname,
  database: process.env.DB_NAME || new URL(databaseUrl).pathname.replace('/', ''),
  user: process.env.DB_USER || new URL(databaseUrl).username,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});

