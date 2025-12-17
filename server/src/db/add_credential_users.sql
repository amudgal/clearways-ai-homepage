-- Migration: Add credential-based user authentication
-- Adds username and password_hash fields to site_users table

-- Add username column (nullable, unique if not null)
ALTER TABLE site_users 
ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Add password_hash column (nullable)
ALTER TABLE site_users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_users_username ON site_users(username) WHERE username IS NOT NULL;

-- Add comment to explain the fields
COMMENT ON COLUMN site_users.username IS 'Username for credential-based login (nullable, used for non-email users)';
COMMENT ON COLUMN site_users.password_hash IS 'Bcrypt hash of user password (nullable, only for credential-based users)';

