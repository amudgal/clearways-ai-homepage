-- Migration: Add analysis_type to site_analyses table
-- Adds support for multiple analysis types (TCO, Timeline, etc.)

-- Add analysis_type column with default value 'TCO' for existing records
ALTER TABLE site_analyses 
ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(50) NOT NULL DEFAULT 'TCO';

-- Add constraint to ensure valid analysis types
ALTER TABLE site_analyses 
DROP CONSTRAINT IF EXISTS check_analysis_type;

ALTER TABLE site_analyses 
ADD CONSTRAINT check_analysis_type CHECK (analysis_type IN ('TCO', 'TIMELINE'));

-- Add index for faster queries by analysis type
CREATE INDEX IF NOT EXISTS idx_site_analyses_type ON site_analyses(analysis_type);

-- Add comment to explain the field
COMMENT ON COLUMN site_analyses.analysis_type IS 'Type of analysis: TCO (Total Cost of Ownership) or TIMELINE (Timeline Estimate)';

