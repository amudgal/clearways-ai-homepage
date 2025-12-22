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
   * Query ROC database from official Arizona ROC website
   * https://azroc.my.site.com/AZRoc/s/contractor-search
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
      console.log('[RocLookup] Database query failed, trying official ROC website:', error);
    }

    // Option 2: Scrape official Arizona ROC contractor search website
    // https://azroc.my.site.com/AZRoc/s/contractor-search
    try {
      const rocSearchUrl = `https://azroc.my.site.com/AZRoc/s/contractor-search`;
      
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'RocLookup',
        summary: `Querying official ROC website: ${rocSearchUrl} for ROC ${rocNumber}`,
      });

      // Use Playwright to scrape the ROC search page
      // Note: This requires Playwright to be installed and configured
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      try {
        // Navigate to ROC search page
        await page.goto(rocSearchUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for search form to load
        await page.waitForSelector('input[type="search"], input[name*="search"], input[id*="search"]', { timeout: 10000 });

        // Fill in ROC number and submit
        const searchInput = await page.$('input[type="search"], input[name*="search"], input[id*="search"], input[placeholder*="ROC"]');
        if (searchInput) {
          await searchInput.fill(rocNumber);
          await page.keyboard.press('Enter');
          
          // Wait for results
          await page.waitForTimeout(2000);
          
          // Extract contractor information from results page
          const contractorData = await page.evaluate((rocNum) => {
            // Try to find contractor information in the page
            const data: any = { rocNumber: rocNum };
            
            // Look for common selectors in Salesforce-based sites
            const nameElement = document.querySelector('[data-label*="Name"], .slds-text-heading, h1, h2, .contractor-name');
            if (nameElement) {
              data.contractorName = nameElement.textContent?.trim();
            }

            const businessElement = document.querySelector('[data-label*="Business"], .business-name');
            if (businessElement) {
              data.businessName = businessElement.textContent?.trim();
            }

            const addressElement = document.querySelector('[data-label*="Address"], .address');
            if (addressElement) {
              data.address = addressElement.textContent?.trim();
            }

            const phoneElement = document.querySelector('[data-label*="Phone"], .phone, a[href^="tel:"]');
            if (phoneElement) {
              data.phone = phoneElement.textContent?.trim() || phoneElement.getAttribute('href')?.replace('tel:', '');
            }

            const websiteElement = document.querySelector('[data-label*="Website"], .website, a[href^="http"]');
            if (websiteElement) {
              data.website = websiteElement.textContent?.trim() || websiteElement.getAttribute('href');
            }

            const classificationElement = document.querySelector('[data-label*="Classification"], .classification');
            if (classificationElement) {
              data.classification = classificationElement.textContent?.trim();
            }

            const statusElement = document.querySelector('[data-label*="Status"], .status, .license-status');
            if (statusElement) {
              data.licenseStatus = statusElement.textContent?.trim();
            }

            return Object.keys(data).length > 1 ? data : null;
          }, rocNumber);

          await browser.close();

          if (contractorData) {
            this.emitEvent({
              ts: new Date().toISOString(),
              level: 'success',
              agent: 'RocLookup',
              summary: `Found contractor data from official ROC website`,
            });

            return {
              rocNumber: contractorData.rocNumber || rocNumber,
              contractorName: contractorData.contractorName || contractorName,
              businessName: contractorData.businessName,
              website: contractorData.website,
              address: contractorData.address,
              phone: contractorData.phone,
              classification: contractorData.classification,
              licenseStatus: contractorData.licenseStatus,
            };
          }
        }
      } catch (scrapeError) {
        console.error('[RocLookup] Failed to scrape ROC website:', scrapeError);
        await browser.close();
      }
    } catch (error) {
      console.error('[RocLookup] ROC website scraping not available:', error);
    }

    // Option 3: Fallback - return basic data from input
    this.emitEvent({
      ts: new Date().toISOString(),
      level: 'warning',
      agent: 'RocLookup',
      summary: `Could not query ROC database. Using provided contractor name.`,
    });

    return {
      rocNumber,
      contractorName,
      businessName: null,
      website: null,
      address: null,
      phone: null,
      classification: null,
      licenseStatus: null,
    };
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

