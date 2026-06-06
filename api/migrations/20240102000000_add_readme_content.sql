-- Adds the readme_content column that was referenced in the repositories model
-- but omitted from the initial migration. Without this, every repository
-- upsert fails because the INSERT explicitly names the column.
ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS readme_content TEXT;
