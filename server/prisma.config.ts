// Prisma Configuration for Prisma 7+
// Connection URLs are now configured here instead of in schema.prisma
// Uses the existing PostgreSQL database configured in DATABASE_URL

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Use the existing DATABASE_URL from environment
// This should point to your existing PostgreSQL database
const databaseUrl = env('DATABASE_URL');

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in your .env file to point to your existing PostgreSQL database.');
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

