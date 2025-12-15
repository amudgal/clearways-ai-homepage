-- Fix ancillary_license_pct precision to support larger dollar amounts
-- Change from DECIMAL(5, 2) to DECIMAL(15, 2) to match other cost fields

ALTER TABLE site_analysis_inputs 
ALTER COLUMN ancillary_license_pct TYPE DECIMAL(15, 2);

