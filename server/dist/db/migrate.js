"use strict";
// Database Migration Script
// Run this to set up the database schema
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const database_1 = require("../config/database");
async function migrate() {
    try {
        console.log('🔄 Starting database migration...');
        // Read schema file
        const schemaPath = (0, path_1.join)(__dirname, 'schema.sql');
        const schema = (0, fs_1.readFileSync)(schemaPath, 'utf-8');
        // Execute schema
        await database_1.pool.query(schema);
        console.log('✅ Database migration completed successfully!');
        // Insert default tenant for ClearWays AI
        await database_1.pool.query(`
      INSERT INTO site_tenants (name, domain, status)
      VALUES ('Clear Ways AI', 'clearways.ai', 'ACTIVE')
      ON CONFLICT (domain) DO NOTHING
    `);
        // Insert default tenant for American Express
        await database_1.pool.query(`
      INSERT INTO site_tenants (name, domain, status)
      VALUES ('American Express', 'aexp.com', 'ACTIVE')
      ON CONFLICT (domain) DO NOTHING
    `);
        console.log('✅ Default tenants created');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}
migrate();
//# sourceMappingURL=migrate.js.map