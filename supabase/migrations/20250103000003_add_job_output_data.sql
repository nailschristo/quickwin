-- Add output_data column to jobs table to store processed CSV data
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS output_data jsonb;