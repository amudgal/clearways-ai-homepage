#!/usr/bin/env tsx
// Wrapper script to ensure DATABASE_URL is set before running Prisma commands
// Usage: tsx scripts/prisma-with-env.ts db push
//        tsx scripts/prisma-with-env.ts generate
//        tsx scripts/prisma-with-env.ts migrate dev

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the buildDatabaseUrl helper to set DATABASE_URL
import '../src/config/buildDatabaseUrl';

// Get all arguments after the script name
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: tsx scripts/prisma-with-env.ts <prisma-command> [args...]');
  console.error('Example: tsx scripts/prisma-with-env.ts db push');
  process.exit(1);
}

// Ensure DATABASE_URL is set in the environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set!');
  console.error('Please ensure buildDatabaseUrl.ts has set DATABASE_URL in process.env');
  process.exit(1);
}

// Log database info (without password)
const dbUrl = new URL(process.env.DATABASE_URL);
console.log(`✅ DATABASE_URL is set`);
console.log(`   Host: ${dbUrl.hostname}`);
console.log(`   Database: ${dbUrl.pathname.replace('/', '')}`);
console.log(`   User: ${dbUrl.username}`);

// Build the Prisma command with DATABASE_URL explicitly set
const prismaCommand = `npx prisma ${args.join(' ')}`;

console.log(`\nRunning: ${prismaCommand}\n`);

try {
  // Pass DATABASE_URL explicitly to the child process
  // Prisma CLI reads DATABASE_URL from environment, not from prisma.config.ts for CLI commands
  execSync(prismaCommand, {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL, // Explicitly pass DATABASE_URL
    },
  });
} catch (error) {
  process.exit(1);
}

