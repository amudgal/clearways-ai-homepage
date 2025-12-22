// Prisma Configuration for Prisma 7+
// Connection URLs are now configured here instead of in schema.prisma

import { defineConfig } from 'prisma';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'clearways_ai'}?sslmode=${process.env.DB_SSL === 'true' ? 'require' : 'prefer'}`,
  },
});

