-- Create job-files storage bucket if it doesn't exist
DO $$
BEGIN
  -- Check if bucket exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'job-files'
  ) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('job-files', 'job-files', false);
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload job files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view job files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete job files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update job files" ON storage.objects;

-- Create new policies for job-files bucket
CREATE POLICY "Users can upload job files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'job-files' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view job files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'job-files' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete job files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'job-files' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update job files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'job-files' AND 
    auth.uid() IS NOT NULL
  );