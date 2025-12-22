// Prisma Client Configuration
// Prisma 7+ - Connection string is passed via environment variable DATABASE_URL
// The schema.prisma file no longer includes the url property

import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
// Prisma 7 will read DATABASE_URL from environment variables automatically
// Make sure DATABASE_URL is set in your .env file
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

