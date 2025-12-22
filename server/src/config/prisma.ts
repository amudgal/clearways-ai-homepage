// Prisma Client Configuration
// Prisma 7+ uses DATABASE_URL from environment variables or .env file
// The schema.prisma file defines the datasource URL

import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
// Prisma will automatically use DATABASE_URL from environment variables
// Make sure DATABASE_URL is set in your .env file or environment
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

