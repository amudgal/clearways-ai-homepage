// ROC Lookup Agent - Finds contractor records from Arizona ROC database
import { BaseAgent } from '../base/BaseAgent';
import { AgentResult, AgentContext, Entity, Evidence } from '../types';
import { pool } from '../../config/database';

export class RocLookupAgent extends BaseAgent {
  async execute(): Promise<AgentResult> {
    try {
      const { rocNumber, contractorName } = this.context.contractorInput;

      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'RocLookup',
        summary: `Looking up ROC ${rocNumber} in Arizona ROC database`,
      });

      // Query ROC database (this is a placeholder - you'll need to implement actual ROC API or database)
      const rocData = await this.queryROCDatabase(rocNumber, contractorName);

      if (!rocData) {
        this.emitEvent({
          ts: new Date().toISOString(),
          level: 'warning',
          agent: 'RocLookup',
          summary: `ROC ${rocNumber} not found in database`,
        });

        return {
          success: false,
          error: `ROC ${rocNumber} not found`,
          cost: 0,
        };
      }

      // Create entity from ROC data
      const entity: Entity = {
        id: `entity-${Date.now()}-${rocNumber}`,
        rocNumber: rocData.rocNumber,
        contractorName: rocData.contractorName || contractorName,
        officialWebsite: rocData.website,
        businessName: rocData.businessName,
        address: rocData.address,
        phone: rocData.phone,
        classification: rocData.classification,
        licenseStatus: rocData.licenseStatus,
      };

      // Store entity in database
      await this.storeEntity(entity);

      // Create evidence
      const evidence: Evidence = {
        type: 'roc_record',
        source: 'Arizona ROC Database',
        content: JSON.stringify(rocData),
        url: `https://roc.az.gov/contractor/${rocNumber}`,
        timestamp: new Date(),
      };

      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'success',
        agent: 'RocLookup',
        summary: `Found ROC record: ${rocData.contractorName || contractorName}`,
        details: {
          website: rocData.website,
          classification: rocData.classification,
          status: rocData.licenseStatus,
        },
      });

      return {
        success: true,
        data: entity,
        evidence: [evidence],
        cost: 0, // ROC lookup is free
      };
    } catch (error) {
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'error',
        agent: 'RocLookup',
        summary: `Error looking up ROC: ${error instanceof Error ? error.message : String(error)}`,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        cost: 0,
      };
    }
  }

  /**
   * Query ROC database
   * TODO: Implement actual ROC API integration or database query
   * For now, this is a placeholder that simulates ROC data
   */
  private async queryROCDatabase(rocNumber: string, contractorName: string): Promise<any> {
    // Option 1: Query from your own database if you've imported ROC data
    try {
      const result = await pool.query(
        `SELECT 
          roc_number,
          contractor_name,
          business_name,
          website,
          address,
          phone,
          classification,
          license_status
        FROM roc_contractors 
        WHERE roc_number = $1 OR contractor_name ILIKE $2
        LIMIT 1`,
        [rocNumber, `%${contractorName}%`]
      );

      if (result.rows.length > 0) {
        return {
          rocNumber: result.rows[0].roc_number,
          contractorName: result.rows[0].contractor_name,
          businessName: result.rows[0].business_name,
          website: result.rows[0].website,
          address: result.rows[0].address,
          phone: result.rows[0].phone,
          classification: result.rows[0].classification,
          licenseStatus: result.rows[0].license_status,
        };
      }
    } catch (error) {
      console.log('[RocLookup] Database query failed, trying alternative methods:', error);
    }

    // Option 2: Call Arizona ROC API (if available)
    // const response = await fetch(`https://roc.az.gov/api/contractors/${rocNumber}`);
    // if (response.ok) {
    //   return await response.json();
    // }

    // Option 3: Web scrape ROC website (as fallback)
    // This would require implementing a scraper for https://roc.az.gov

    // For now, return null if not found
    return null;
  }

  /**
   * Store entity in database
   */
  private async storeEntity(entity: Entity): Promise<void> {
    try {
      // Store in entities table (if using Prisma schema)
      await pool.query(
        `INSERT INTO entities (
          id, job_id, roc_number, contractor_name, business_name,
          official_website, address, phone, classification, license_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          contractor_name = EXCLUDED.contractor_name,
          business_name = EXCLUDED.business_name,
          official_website = EXCLUDED.official_website,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          classification = EXCLUDED.classification,
          license_status = EXCLUDED.license_status`,
        [
          entity.id,
          this.context.jobId,
          entity.rocNumber,
          entity.contractorName,
          entity.businessName,
          entity.officialWebsite,
          entity.address,
          entity.phone,
          entity.classification,
          entity.licenseStatus,
        ]
      );

      this.context.currentEntityId = entity.id;
    } catch (error) {
      console.error('[RocLookup] Failed to store entity:', error);
      // Don't fail the whole operation if storage fails
    }
  }
}

