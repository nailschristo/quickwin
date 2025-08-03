-- Add policy to allow service role to upload to job-files bucket
-- This is needed for Edge Functions to upload files

-- First, check if the policy exists and drop it if it does
DROP POLICY IF EXISTS "Service role can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage files" ON storage.objects;

-- Create a policy that allows authenticated service role to manage files
CREATE POLICY "Service role can manage files" ON storage.objects
  FOR ALL 
  USING (bucket_id = 'job-files')
  WITH CHECK (bucket_id = 'job-files');