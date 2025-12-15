"use strict";
// Migration script to add UNIQUE constraint to site_cloud_pricing
// Run this after the initial migration if the table already exists
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const database_1 = require("../config/database");
async function addConstraint() {
    try {
        console.log('🔄 Adding UNIQUE constraint to site_cloud_pricing...');
        // Read constraint SQL file
        const constraintPath = (0, path_1.join)(__dirname, 'add_unique_constraint.sql');
        const constraintSQL = (0, fs_1.readFileSync)(constraintPath, 'utf-8');
        // Execute constraint SQL
        await database_1.pool.query(constraintSQL);
        console.log('✅ UNIQUE constraint added successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Failed to add constraint:', error);
        process.exit(1);
    }
}
addConstraint();
//# sourceMappingURL=add_constraint.js.map