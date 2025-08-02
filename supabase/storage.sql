-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('job-files', 'job-files', false),
  ('exports', 'exports', false);

-- Set up storage policies
-- Job files bucket: Users can upload and view their own files
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

-- Exports bucket: Users can view and download their own exports
CREATE POLICY "Users can create exports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own exports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );