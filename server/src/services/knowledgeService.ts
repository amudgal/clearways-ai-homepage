// Knowledge Service - Stores successful data captures for future use
// Only stores data when capture was successful (not "Not Found" or empty)

import { pool } from '../config/database';
import { Entity, EmailCandidate } from '../agents/types';

export interface StoredContractorKnowledge {
  rocNumber: string;
  contractorName: string;
  businessName?: string;
  website?: string;
  address?: string;
  phone?: string;
  classification?: string;
  licenseStatus?: string;
  lastVerified: Date;
  source: string; // e.g., 'roc-website', 'database', 'scraped'
}

export interface StoredEmailKnowledge {
  email: string;
  rocNumber: string;
  contractorName: string;
  confidence: number;
  sources: string[];
  validated: boolean;
  lastVerified: Date;
}

export class KnowledgeService {
  /**
   * Store successful contractor data capture
   * Only stores if we have meaningful data (not just ROC number)
   */
  async storeContractorKnowledge(data: {
    rocNumber: string;
    contractorName: string;
    businessName?: string;
    website?: string;
    address?: string;
    phone?: string;
    classification?: string;
    licenseStatus?: string;
    source: string;
  }): Promise<boolean> {
    try {
      // Only store if we have at least contractor name (not just ROC number)
      if (!data.contractorName || data.contractorName.trim() === '') {
        return false;
      }

      // Check if we already have this contractor
      const existing = await pool.query(
        `SELECT id, last_verified FROM contractor_knowledge 
         WHERE roc_number = $1`,
        [data.rocNumber]
      );

      if (existing.rows.length > 0) {
        // Update existing record
        await pool.query(
          `UPDATE contractor_knowledge SET
            contractor_name = $1,
            business_name = $2,
            website = $3,
            address = $4,
            phone = $5,
            classification = $6,
            license_status = $7,
            source = $8,
            last_verified = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
           WHERE roc_number = $9`,
          [
            data.contractorName,
            data.businessName || null,
            data.website || null,
            data.address || null,
            data.phone || null,
            data.classification || null,
            data.licenseStatus || null,
            data.source,
            data.rocNumber,
          ]
        );
        console.log(`[KnowledgeService] Updated contractor knowledge for ROC ${data.rocNumber}`);
      } else {
        // Insert new record
        await pool.query(
          `INSERT INTO contractor_knowledge (
            roc_number, contractor_name, business_name, website,
            address, phone, classification, license_status, source,
            last_verified, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            data.rocNumber,
            data.contractorName,
            data.businessName || null,
            data.website || null,
            data.address || null,
            data.phone || null,
            data.classification || null,
            data.licenseStatus || null,
            data.source,
          ]
        );
        console.log(`[KnowledgeService] Stored new contractor knowledge for ROC ${data.rocNumber}`);
      }

      return true;
    } catch (error) {
      console.error('[KnowledgeService] Failed to store contractor knowledge:', error);
      return false;
    }
  }

  /**
   * Store successful email discovery
   * Only stores if email is valid and confidence is above threshold
   */
  async storeEmailKnowledge(data: {
    email: string;
    rocNumber: string;
    contractorName: string;
    confidence: number;
    sources: string[];
    validated: boolean;
  }): Promise<boolean> {
    try {
      // Only store if email is valid and confidence is reasonable
      if (!data.email || 
          data.email === 'Not Found' || 
          !data.email.includes('@') ||
          data.confidence < 30) { // Minimum confidence threshold
        return false;
      }

      // Check if we already have this email for this contractor
      const existing = await pool.query(
        `SELECT id, confidence, last_verified FROM email_knowledge 
         WHERE email = $1 AND roc_number = $2`,
        [data.email, data.rocNumber]
      );

      if (existing.rows.length > 0) {
        const existingConfidence = existing.rows[0].confidence;
        // Only update if new confidence is higher
        if (data.confidence > existingConfidence) {
          await pool.query(
            `UPDATE email_knowledge SET
              confidence = $1,
              sources = $2,
              validated = $3,
              last_verified = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
             WHERE email = $4 AND roc_number = $5`,
            [
              data.confidence,
              JSON.stringify(data.sources),
              data.validated,
              data.email,
              data.rocNumber,
            ]
          );
          console.log(`[KnowledgeService] Updated email knowledge: ${data.email} (confidence: ${data.confidence})`);
        }
      } else {
        // Insert new record
        await pool.query(
          `INSERT INTO email_knowledge (
            email, roc_number, contractor_name, confidence,
            sources, validated, last_verified, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            data.email,
            data.rocNumber,
            data.contractorName,
            data.confidence,
            JSON.stringify(data.sources),
            data.validated,
          ]
        );
        console.log(`[KnowledgeService] Stored new email knowledge: ${data.email} for ROC ${data.rocNumber}`);
      }

      return true;
    } catch (error) {
      console.error('[KnowledgeService] Failed to store email knowledge:', error);
      return false;
    }
  }

  /**
   * Retrieve contractor knowledge from database
   * Used to avoid re-querying ROC website if we already have the data
   */
  async getContractorKnowledge(rocNumber: string): Promise<StoredContractorKnowledge | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM contractor_knowledge 
         WHERE roc_number = $1 
         ORDER BY last_verified DESC 
         LIMIT 1`,
        [rocNumber]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          rocNumber: row.roc_number,
          contractorName: row.contractor_name,
          businessName: row.business_name,
          website: row.website,
          address: row.address,
          phone: row.phone,
          classification: row.classification,
          licenseStatus: row.license_status,
          lastVerified: row.last_verified,
          source: row.source,
        };
      }

      return null;
    } catch (error) {
      console.error('[KnowledgeService] Failed to retrieve contractor knowledge:', error);
      return null;
    }
  }

  /**
   * Retrieve email knowledge from database
   * Used to avoid re-discovering emails we already found
   */
  async getEmailKnowledge(rocNumber: string): Promise<StoredEmailKnowledge[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM email_knowledge 
         WHERE roc_number = $1 
         ORDER BY confidence DESC, last_verified DESC`,
        [rocNumber]
      );

      return result.rows.map(row => ({
        email: row.email,
        rocNumber: row.roc_number,
        contractorName: row.contractor_name,
        confidence: row.confidence,
        sources: JSON.parse(row.sources || '[]'),
        validated: row.validated,
        lastVerified: row.last_verified,
      }));
    } catch (error) {
      console.error('[KnowledgeService] Failed to retrieve email knowledge:', error);
      return [];
    }
  }

  /**
   * Store discovered source information
   * Tracks which sources are effective for finding contractor information
   */
  async storeSourceKnowledge(data: {
    source: string;
    rocNumber: string;
    success: boolean;
    dataFound: string[]; // e.g., ['email', 'phone', 'address']
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO source_knowledge (
          source, roc_number, success, data_found, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING`,
        [
          data.source,
          data.rocNumber,
          data.success,
          JSON.stringify(data.dataFound),
        ]
      );
    } catch (error) {
      console.error('[KnowledgeService] Failed to store source knowledge:', error);
    }
  }
}

