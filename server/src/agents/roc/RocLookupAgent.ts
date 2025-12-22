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
        summary: `Looking up ROC ${rocNumber} from official Arizona ROC website: https://azroc.my.site.com/AZRoc/s/contractor-search`,
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
        url: `https://azroc.my.site.com/AZRoc/s/contractor-search?search=${rocNumber}`,
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

        // Wait for page to load (Salesforce sites can take time)
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(2000); // Additional wait for dynamic content

        // Try multiple selector strategies for Salesforce-based sites
        let searchInput = null;
        const possibleSelectors = [
          'input[type="search"]',
          'input[name*="search"]',
          'input[id*="search"]',
          'input[placeholder*="ROC"]',
          'input[placeholder*="License"]',
          'input[placeholder*="Contractor"]',
          'input.slds-input',
          'input[class*="input"]',
          'input',
        ];

        for (const selector of possibleSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            searchInput = await page.$(selector);
            if (searchInput) break;
          } catch (e) {
            continue;
          }
        }

        if (searchInput) {
          await searchInput.fill(rocNumber);
          await page.keyboard.press('Enter');
          
          // Wait for results to load
          await page.waitForTimeout(3000);
          await page.waitForLoadState('networkidle', { timeout: 15000 });
          
          // Extract contractor information from results page
          const contractorData = await page.evaluate((rocNum) => {
            // Try to find contractor information in the page
            const data: any = { rocNumber: rocNum };
            
            // Look for common selectors in Salesforce-based sites (Salesforce Lightning Design System)
            const selectors = {
              name: [
                '[data-label*="Name"]',
                '[data-label*="Contractor"]',
                '.slds-text-heading_large',
                '.slds-text-heading_medium',
                'h1', 'h2', 'h3',
                '.contractor-name',
                '[class*="name"]',
                'td:contains("Name")',
              ],
              business: [
                '[data-label*="Business"]',
                '[data-label*="Company"]',
                '.business-name',
                '[class*="business"]',
              ],
              address: [
                '[data-label*="Address"]',
                '[data-label*="Location"]',
                '.address',
                '[class*="address"]',
              ],
              phone: [
                '[data-label*="Phone"]',
                '[data-label*="Telephone"]',
                '.phone',
                'a[href^="tel:"]',
                '[class*="phone"]',
              ],
              website: [
                '[data-label*="Website"]',
                '[data-label*="Web"]',
                '.website',
                'a[href^="http"]:not([href*="azroc"])',
                '[class*="website"]',
              ],
              classification: [
                '[data-label*="Classification"]',
                '[data-label*="Type"]',
                '.classification',
                '[class*="classification"]',
              ],
              status: [
                '[data-label*="Status"]',
                '[data-label*="License Status"]',
                '.status',
                '.license-status',
                '[class*="status"]',
              ],
            };

            // Try to find name
            for (const selector of selectors.name) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                data.contractorName = element.textContent.trim();
                break;
              }
            }

            // Try to find business name
            for (const selector of selectors.business) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                data.businessName = element.textContent.trim();
                break;
              }
            }

            // Try to find address
            for (const selector of selectors.address) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                data.address = element.textContent.trim();
                break;
              }
            }

            // Try to find phone
            for (const selector of selectors.phone) {
              const element = document.querySelector(selector);
              if (element) {
                data.phone = element.textContent?.trim() || element.getAttribute('href')?.replace('tel:', '');
                if (data.phone) break;
              }
            }

            // Try to find website
            for (const selector of selectors.website) {
              const element = document.querySelector(selector);
              if (element) {
                data.website = element.textContent?.trim() || element.getAttribute('href');
                if (data.website && !data.website.includes('azroc')) break;
              }
            }

            // Try to find classification
            for (const selector of selectors.classification) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                data.classification = element.textContent.trim();
                break;
              }
            }

            // Try to find status
            for (const selector of selectors.status) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                data.licenseStatus = element.textContent.trim();
                break;
              }
            }

            // Also try to extract from table rows if present
            const rows = document.querySelectorAll('tr, .slds-table tbody tr');
            rows.forEach((row) => {
              const cells = row.querySelectorAll('td, th');
              cells.forEach((cell, idx) => {
                const text = cell.textContent?.trim() || '';
                const header = cells[0]?.textContent?.trim() || '';
                
                if (header.toLowerCase().includes('name') && !data.contractorName) {
                  data.contractorName = text;
                }
                if (header.toLowerCase().includes('business') && !data.businessName) {
                  data.businessName = text;
                }
                if (header.toLowerCase().includes('address') && !data.address) {
                  data.address = text;
                }
                if (header.toLowerCase().includes('phone') && !data.phone) {
                  data.phone = text;
                }
                if (header.toLowerCase().includes('website') && !data.website) {
                  data.website = text;
                }
                if (header.toLowerCase().includes('classification') && !data.classification) {
                  data.classification = text;
                }
                if (header.toLowerCase().includes('status') && !data.licenseStatus) {
                  data.licenseStatus = text;
                }
              });
            });

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

