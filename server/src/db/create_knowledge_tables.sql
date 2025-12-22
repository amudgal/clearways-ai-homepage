-- Knowledge Storage Tables
-- Stores successful data captures for future use and learning

-- Contractor Knowledge Table
-- Stores successfully captured contractor information from ROC lookups
CREATE TABLE IF NOT EXISTS contractor_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roc_number VARCHAR(50) NOT NULL UNIQUE,
    contractor_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    website VARCHAR(500),
    address TEXT,
    phone VARCHAR(50),
    classification VARCHAR(100),
    license_status VARCHAR(50),
    source VARCHAR(100) NOT NULL, -- e.g., 'roc-website', 'database', 'scraped'
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contractor_knowledge_roc_number ON contractor_knowledge(roc_number);
CREATE INDEX IF NOT EXISTS idx_contractor_knowledge_contractor_name ON contractor_knowledge(contractor_name);
CREATE INDEX IF NOT EXISTS idx_contractor_knowledge_last_verified ON contractor_knowledge(last_verified);

COMMENT ON TABLE contractor_knowledge IS 'Stores successfully captured contractor information for future use';
COMMENT ON COLUMN contractor_knowledge.source IS 'Source of the data: roc-website, database, scraped, etc.';
COMMENT ON COLUMN contractor_knowledge.last_verified IS 'Last time this data was verified/updated';

-- Email Knowledge Table
-- Stores successfully discovered and validated email addresses
CREATE TABLE IF NOT EXISTS email_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    roc_number VARCHAR(50) NOT NULL,
    contractor_name VARCHAR(255) NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    sources JSONB NOT NULL DEFAULT '[]', -- Array of source names
    validated BOOLEAN DEFAULT false,
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, roc_number)
);

CREATE INDEX IF NOT EXISTS idx_email_knowledge_roc_number ON email_knowledge(roc_number);
CREATE INDEX IF NOT EXISTS idx_email_knowledge_email ON email_knowledge(email);
CREATE INDEX IF NOT EXISTS idx_email_knowledge_confidence ON email_knowledge(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_email_knowledge_validated ON email_knowledge(validated);

COMMENT ON TABLE email_knowledge IS 'Stores successfully discovered email addresses with confidence scores';
COMMENT ON COLUMN email_knowledge.confidence IS 'Confidence score 0-100 for email validity';
COMMENT ON COLUMN email_knowledge.sources IS 'JSON array of sources that confirmed this email';
COMMENT ON COLUMN email_knowledge.validated IS 'Whether email has been validated (MX record, SMTP check, etc.)';

-- Source Knowledge Table
-- Tracks which sources are effective for finding contractor information
CREATE TABLE IF NOT EXISTS source_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(100) NOT NULL, -- e.g., 'roc-website', 'linkedin', 'business-directory'
    roc_number VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    data_found JSONB DEFAULT '[]', -- Array of data types found: ['email', 'phone', 'address']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_knowledge_source ON source_knowledge(source);
CREATE INDEX IF NOT EXISTS idx_source_knowledge_roc_number ON source_knowledge(roc_number);
CREATE INDEX IF NOT EXISTS idx_source_knowledge_success ON source_knowledge(success);

COMMENT ON TABLE source_knowledge IS 'Tracks effectiveness of different sources for finding contractor data';
COMMENT ON COLUMN source_knowledge.data_found IS 'JSON array of data types successfully found from this source';

