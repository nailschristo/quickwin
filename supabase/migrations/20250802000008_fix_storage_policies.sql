-- Drop all existing policies on storage.objects for job-files bucket
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%job%files%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Create simple, permissive policies for testing
CREATE POLICY "Anyone can upload to job-files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'job-files');

CREATE POLICY "Anyone can view job-files" ON storage.objects
FOR SELECT USING (bucket_id = 'job-files');

CREATE POLICY "Anyone can update job-files" ON storage.objects  
FOR UPDATE USING (bucket_id = 'job-files');

CREATE POLICY "Anyone can delete from job-files" ON storage.objects
FOR DELETE USING (bucket_id = 'job-files');