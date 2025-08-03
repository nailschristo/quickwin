-- Add transformation support to column mappings
ALTER TABLE column_mappings
ADD COLUMN transformation_config JSONB,
ADD COLUMN is_multi_source BOOLEAN DEFAULT FALSE,
ADD COLUMN is_multi_target BOOLEAN DEFAULT FALSE;

-- Create column_transformations table for complex transformations
CREATE TABLE column_transformations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    transformation_type VARCHAR(50) NOT NULL CHECK (
        transformation_type IN (
            'split',
            'combine', 
            'format',
            'extract',
            'conditional',
            'custom'
        )
    ),
    source_columns TEXT[] NOT NULL, -- Array of source column names
    target_columns TEXT[] NOT NULL, -- Array of target column names
    configuration JSONB NOT NULL, -- Transformation-specific configuration
    execution_order INTEGER DEFAULT 0, -- For chained transformations
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_column_transformations_job_id ON column_transformations(job_id);
CREATE INDEX idx_column_transformations_type ON column_transformations(transformation_type);
CREATE INDEX idx_column_transformations_order ON column_transformations(execution_order);

-- Add RLS policies for column_transformations
CREATE POLICY "Users can view their transformations" ON column_transformations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = column_transformations.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create transformations" ON column_transformations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = column_transformations.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their transformations" ON column_transformations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = column_transformations.job_id
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their transformations" ON column_transformations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = column_transformations.job_id
            AND jobs.user_id = auth.uid()
        )
    );

-- Enable RLS
ALTER TABLE column_transformations ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_column_transformations_updated_at
    BEFORE UPDATE ON column_transformations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();