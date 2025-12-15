-- Analysis Versions Table
-- Stores versioned editable content for analyses
CREATE TABLE IF NOT EXISTS site_analysis_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES site_analyses(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    editable_content JSONB NOT NULL, -- Stores costRows, assumptions, insights, terms, qa, architectureImpact
    created_by UUID NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(analysis_id, version_number)
);

-- Add version_number to site_analyses to track current version
ALTER TABLE site_analyses ADD COLUMN IF NOT EXISTS current_version_number INTEGER DEFAULT 1;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_site_analysis_versions_analysis_id ON site_analysis_versions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_site_analysis_versions_created_at ON site_analysis_versions(created_at DESC);

