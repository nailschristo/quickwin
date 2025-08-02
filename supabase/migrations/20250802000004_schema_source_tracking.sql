-- Add source tracking and last used timestamp to schemas
ALTER TABLE schemas 
ADD COLUMN source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'template', 'import')),
ADD COLUMN last_used_at TIMESTAMPTZ;

-- Update existing schemas to have source = 'manual'
UPDATE schemas SET source = 'manual' WHERE source IS NULL;

-- Create an index on last_used_at for performance
CREATE INDEX idx_schemas_last_used ON schemas(last_used_at DESC);

-- Create a function to update last_used_at when a job is created
CREATE OR REPLACE FUNCTION update_schema_last_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE schemas 
    SET last_used_at = NOW() 
    WHERE id = NEW.schema_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_used_at
CREATE TRIGGER update_schema_last_used_trigger
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_schema_last_used();