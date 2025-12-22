-- Add created_by column to site_analysis_versions if it doesn't exist
ALTER TABLE site_analysis_versions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES site_users(id) ON DELETE CASCADE;

-- Make it NOT NULL only if the table is empty or we can set a default
-- For existing rows, we'll need to handle this carefully
-- For now, we'll allow NULL temporarily and update existing rows
UPDATE site_analysis_versions 
SET created_by = (SELECT created_by FROM site_analyses WHERE site_analyses.id = site_analysis_versions.analysis_id LIMIT 1)
WHERE created_by IS NULL;

-- Now make it NOT NULL if all rows have values
-- If there are still NULLs, we'll need to handle them differently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM site_analysis_versions WHERE created_by IS NULL
  ) THEN
    ALTER TABLE site_analysis_versions ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;

