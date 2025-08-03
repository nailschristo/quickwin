-- Add metadata column to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS metadata jsonb;