"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const database_1 = require("../config/database");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function addAnalysisVersions() {
    try {
        console.log('🔄 Adding analysis versions table...');
        const sql = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'add_analysis_versions.sql'), 'utf-8');
        await database_1.pool.query(sql);
        console.log('✅ Successfully added analysis versions table');
    }
    catch (error) {
        console.error('❌ Error adding analysis versions table:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
addAnalysisVersions();
//# sourceMappingURL=add_analysis_versions.js.map