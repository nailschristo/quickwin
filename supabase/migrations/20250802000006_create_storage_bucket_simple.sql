-- Create job-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-files', 'job-files', false)
ON CONFLICT (id) DO NOTHING;