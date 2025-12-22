"use strict";
/**
 * Script to delete all versions for Amex tenant TCO analyses
 * This resets all Amex analyses to start from version 1.0
 *
 * Run with: npm run delete-amex-versions
 * Or: npx tsx server/src/db/delete_amex_versions.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
async function deleteAmexVersions() {
    try {
        console.log('Starting deletion of all versions for Amex tenant...');
        // Find Amex tenant
        const tenantResult = await database_1.pool.query("SELECT id, name FROM site_tenants WHERE LOWER(name) LIKE '%amex%' OR LOWER(domain) LIKE '%amex%'");
        if (tenantResult.rows.length === 0) {
            console.error('Amex tenant not found. Available tenants:');
            const allTenants = await database_1.pool.query('SELECT id, name, domain FROM site_tenants');
            allTenants.rows.forEach(t => {
                console.log(`  - ${t.name} (${t.domain}) - ID: ${t.id}`);
            });
            process.exit(1);
        }
        const amexTenant = tenantResult.rows[0];
        console.log(`Found Amex tenant: ${amexTenant.name} (ID: ${amexTenant.id})`);
        // Get all analyses for Amex tenant
        const analysesResult = await database_1.pool.query('SELECT id, title, analysis_type, current_version_number FROM site_analyses WHERE tenant_id = $1', [amexTenant.id]);
        console.log(`Found ${analysesResult.rows.length} analysis/analyses for Amex tenant`);
        if (analysesResult.rows.length === 0) {
            console.log('No analyses found for Amex tenant. Exiting.');
            process.exit(0);
        }
        const analysisIds = analysesResult.rows.map(row => row.id);
        // Show what will be deleted
        analysesResult.rows.forEach(analysis => {
            console.log(`  - ${analysis.title || 'Untitled'} (${analysis.analysis_type}) - Current version: ${analysis.current_version_number || 0}`);
        });
        // Delete all versions for all Amex analyses
        const deleteResult = await database_1.pool.query(`DELETE FROM site_analysis_versions 
       WHERE analysis_id = ANY($1::uuid[])
       RETURNING version_number, analysis_id`, [analysisIds]);
        console.log(`\nDeleted ${deleteResult.rows.length} version(s) total`);
        // Reset current_version_number to 0 for all Amex analyses
        const updateResult = await database_1.pool.query('UPDATE site_analyses SET current_version_number = 0 WHERE tenant_id = $1 RETURNING id, title', [amexTenant.id]);
        console.log(`Reset current_version_number to 0 for ${updateResult.rows.length} analysis/analyses`);
        updateResult.rows.forEach(analysis => {
            console.log(`  - ${analysis.title || 'Untitled'}`);
        });
        console.log('\n✅ Successfully deleted all versions for Amex tenant');
        console.log('All Amex analyses will now start from version 1.0 on next save');
        await database_1.pool.end();
        process.exit(0);
    }
    catch (error) {
        console.error('Error deleting Amex versions:', error);
        await database_1.pool.end();
        process.exit(1);
    }
}
// Run the script
deleteAmexVersions();
//# sourceMappingURL=delete_amex_versions.js.map