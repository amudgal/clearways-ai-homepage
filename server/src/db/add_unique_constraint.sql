-- Add UNIQUE constraint to site_cloud_pricing table
-- This allows proper upsert functionality for pricing entries

-- First, remove any duplicate entries (keep the most recent one)
DELETE FROM site_cloud_pricing a
USING site_cloud_pricing b
WHERE a.id < b.id
  AND a.pricing_version_id = b.pricing_version_id
  AND a.provider = b.provider
  AND a.service_type = b.service_type;

-- Add UNIQUE constraint
ALTER TABLE site_cloud_pricing
ADD CONSTRAINT site_cloud_pricing_unique_version_provider_service 
UNIQUE (pricing_version_id, provider, service_type);

