-- Enable storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the job-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-files', 
  'job-files', 
  false,
  52428800, -- 50MB limit
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf', 'image/*']::text[]
);

-- Create RLS policies for the bucket
CREATE POLICY "Enable insert for authenticated users only" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-files');

CREATE POLICY "Enable select for authenticated users only" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'job-files');

CREATE POLICY "Enable update for authenticated users only" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'job-files');

CREATE POLICY "Enable delete for authenticated users only" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'job-files');