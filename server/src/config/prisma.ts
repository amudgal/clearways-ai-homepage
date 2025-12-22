// Prisma Client Configuration
// Note: This is a simplified Prisma client for the agent system
// If you have a full Prisma schema, use that instead

import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
// For now, we'll use a basic setup. If you have a schema.prisma file,
// Prisma will automatically generate the client with proper types.
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 
        `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=${process.env.DB_SSL === 'true' ? 'require' : 'prefer'}`,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

