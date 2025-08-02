-- QuickWin Database Schema Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schemas table
CREATE TABLE schemas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create schema_columns table
CREATE TABLE schema_columns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    schema_id UUID NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    position INTEGER NOT NULL,
    sample_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schema_id UUID NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create job_files table
CREATE TABLE job_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    raw_data JSONB,
    processed_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create column_mappings table
CREATE TABLE column_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES job_files(id) ON DELETE CASCADE,
    source_column VARCHAR(255) NOT NULL,
    target_column VARCHAR(255) NOT NULL,
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    mapping_type VARCHAR(20) NOT NULL CHECK (mapping_type IN ('exact', 'fuzzy', 'ai', 'manual')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_schemas_user_id ON schemas(user_id);
CREATE INDEX idx_schema_columns_schema_id ON schema_columns(schema_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_schema_id ON jobs(schema_id);
CREATE INDEX idx_job_files_job_id ON job_files(job_id);
CREATE INDEX idx_column_mappings_job_id ON column_mappings(job_id);
CREATE INDEX idx_column_mappings_file_id ON column_mappings(file_id);

-- Enable Row Level Security
ALTER TABLE schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Schemas: Users can only see and manage their own schemas
CREATE POLICY "Users can view own schemas" ON schemas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schemas" ON schemas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schemas" ON schemas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schemas" ON schemas
    FOR DELETE USING (auth.uid() = user_id);

-- Schema columns: Users can manage columns for their schemas
CREATE POLICY "Users can view schema columns" ON schema_columns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM schemas
            WHERE schemas.id = schema_columns.schema_id
            AND schemas.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create schema columns" ON schema_columns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM schemas
            WHERE schemas.id = schema_columns.schema_id
            AND schemas.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update schema columns" ON schema_columns
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM schemas
            WHERE schemas.id = schema_columns.schema_id
            AND schemas.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete schema columns" ON schema_columns
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM schemas
            WHERE schemas.id = schema_columns.schema_id
            AND schemas.user_id = auth.uid()
        )
    );

-- Jobs: Users can only see and manage their own jobs
CREATE POLICY "Users can view own jobs" ON jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Job files: Users can manage files for their jobs
CREATE POLICY "Users can view job files" ON job_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_files.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create job files" ON job_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_files.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update job files" ON job_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_files.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete job files" ON job_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_files.job_id
            AND jobs.user_id = auth.uid()
        )
    );

-- Column mappings: Users can manage mappings for their jobs
CREATE POLICY "Users can view column mappings" ON column_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = column_mappings.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create column mappings" ON column_mappings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = column_mappings.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update column mappings" ON column_mappings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = column_mappings.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete column mappings" ON column_mappings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = column_mappings.job_id
            AND jobs.user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for schemas table
CREATE TRIGGER update_schemas_updated_at BEFORE UPDATE ON schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('uploads', 'uploads', false),
  ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
-- Uploads bucket: Users can upload and view their own files
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own uploads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
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