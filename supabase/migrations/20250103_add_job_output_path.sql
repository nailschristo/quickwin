-- Add output_file_path to jobs table
ALTER TABLE jobs 
ADD COLUMN output_file_path text;