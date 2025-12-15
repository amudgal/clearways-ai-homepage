-- ClearWays AI TCO Analysis Platform Database Schema
-- PostgreSQL Database Schema for AWS RDS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants Table
CREATE TABLE IF NOT EXISTS site_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS site_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES site_tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_role CHECK (role IN ('USER', 'ADMIN'))
);

-- Pricing Versions Table
CREATE TABLE IF NOT EXISTS site_pricing_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    effective_date DATE NOT NULL,
    created_by UUID REFERENCES site_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Cloud Provider Pricing Table (AWS, GCP, Azure)
CREATE TABLE IF NOT EXISTS site_cloud_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pricing_version_id UUID NOT NULL REFERENCES site_pricing_versions(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    tier VARCHAR(100),
    region VARCHAR(100),
    unit_type VARCHAR(50) NOT NULL, -- 'hourly', 'gb_month', 'gb', 'percentage'
    unit_price DECIMAL(15, 6) NOT NULL,
    annual_multiplier DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_provider CHECK (provider IN ('AWS', 'GCP', 'Azure')),
    CONSTRAINT check_unit_type CHECK (unit_type IN ('hourly', 'gb_month', 'gb', 'percentage')),
    UNIQUE(pricing_version_id, provider, service_type)
);

-- Analyses Table
CREATE TABLE IF NOT EXISTS site_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES site_tenants(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'LIVE',
    created_by UUID NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
    pricing_version_id UUID NOT NULL REFERENCES site_pricing_versions(id),
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    saved_at TIMESTAMP WITH TIME ZONE,
    locked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT check_status CHECK (status IN ('LIVE', 'SAVED', 'LOCKED'))
);

-- Analysis Inputs Table
CREATE TABLE IF NOT EXISTS site_analysis_inputs (
    analysis_id UUID PRIMARY KEY REFERENCES site_analyses(id) ON DELETE CASCADE,
    mstr_license_per_instance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ancillary_license_pct DECIMAL(15, 2) NOT NULL DEFAULT 0,
    instance_count INTEGER NOT NULL DEFAULT 0,
    hosting_environment VARCHAR(50) NOT NULL,
    tier_selections JSONB,
    storage_gb DECIMAL(15, 2) NOT NULL DEFAULT 0,
    egress_gb DECIMAL(15, 2) NOT NULL DEFAULT 0,
    compute_gb DECIMAL(15, 2) NOT NULL DEFAULT 0,
    infrastructure_gb DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cloud_personnel_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    mstr_support_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    CONSTRAINT check_hosting_env CHECK (hosting_environment IN ('AWS', 'GCP', 'Azure'))
);

-- Analysis Computed Results Table
CREATE TABLE IF NOT EXISTS site_analysis_computed_results (
    analysis_id UUID PRIMARY KEY REFERENCES site_analyses(id) ON DELETE CASCADE,
    annualized_licensing DECIMAL(15, 2) NOT NULL,
    annualized_metered_costs DECIMAL(15, 2) NOT NULL,
    annualized_support_costs DECIMAL(15, 2) NOT NULL,
    total_cost DECIMAL(15, 2) NOT NULL,
    confidence_scores JSONB NOT NULL,
    sensitivity_ratings JSONB NOT NULL,
    cost_breakdown JSONB NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS site_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES site_users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES site_tenants(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'analysis', 'pricing', 'user', etc.
    target_id UUID,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OTP Store Table (for passwordless authentication)
CREATE TABLE IF NOT EXISTS site_otp_store (
    email VARCHAR(255) PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_site_users_tenant_id ON site_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_users_email ON site_users(email);
CREATE INDEX IF NOT EXISTS idx_site_analyses_tenant_id ON site_analyses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_analyses_status ON site_analyses(status);
CREATE INDEX IF NOT EXISTS idx_site_analyses_created_by ON site_analyses(created_by);
CREATE INDEX IF NOT EXISTS idx_site_cloud_pricing_version ON site_cloud_pricing(pricing_version_id);
CREATE INDEX IF NOT EXISTS idx_site_cloud_pricing_provider ON site_cloud_pricing(provider);
CREATE INDEX IF NOT EXISTS idx_site_audit_logs_user_id ON site_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_site_audit_logs_tenant_id ON site_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_audit_logs_timestamp ON site_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_site_otp_store_expires_at ON site_otp_store(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (drop if exists, then create)
DROP TRIGGER IF EXISTS update_site_tenants_updated_at ON site_tenants;
CREATE TRIGGER update_site_tenants_updated_at BEFORE UPDATE ON site_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_analyses_updated_at ON site_analyses;
CREATE TRIGGER update_site_analyses_updated_at BEFORE UPDATE ON site_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

