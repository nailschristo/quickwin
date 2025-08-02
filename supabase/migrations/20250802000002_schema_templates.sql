-- Schema Templates and User Preferences Tables

-- Create schema_templates table
CREATE TABLE IF NOT EXISTS public.schema_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create schema_template_columns table
CREATE TABLE IF NOT EXISTS public.schema_template_columns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES schema_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    position INTEGER NOT NULL,
    sample_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    default_schema_id UUID REFERENCES schemas(id),
    theme VARCHAR(20) DEFAULT 'light',
    email_notifications BOOLEAN DEFAULT true,
    auto_save_mappings BOOLEAN DEFAULT true,
    preferred_export_format VARCHAR(20) DEFAULT 'xlsx',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mapping_history table for AI learning
CREATE TABLE IF NOT EXISTS public.mapping_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_column VARCHAR(255) NOT NULL,
    target_column VARCHAR(255) NOT NULL,
    confidence FLOAT NOT NULL,
    was_accepted BOOLEAN NOT NULL,
    file_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.schema_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_template_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapping_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schema_templates
CREATE POLICY "Public templates are viewable by everyone" ON schema_templates
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own templates" ON schema_templates
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own templates" ON schema_templates
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" ON schema_templates
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates" ON schema_templates
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for schema_template_columns
CREATE POLICY "Template columns are viewable with template" ON schema_template_columns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM schema_templates 
            WHERE schema_templates.id = schema_template_columns.template_id 
            AND (schema_templates.is_public = true OR schema_templates.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can manage columns of their templates" ON schema_template_columns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM schema_templates 
            WHERE schema_templates.id = schema_template_columns.template_id 
            AND schema_templates.created_by = auth.uid()
        )
    );

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for mapping_history
CREATE POLICY "Users can view own mapping history" ON mapping_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mapping history" ON mapping_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default schema templates
INSERT INTO public.schema_templates (name, description, category, icon, is_public, created_by) VALUES
    ('Invoice Processing', 'Extract key data from invoices including vendor, date, amount, and line items', 'Financial', '📄', true, NULL),
    ('Contact List', 'Standardize contact information from various sources', 'CRM', '👥', true, NULL),
    ('Inventory Management', 'Track product details, quantities, and locations', 'Operations', '📦', true, NULL),
    ('Financial Reports', 'Consolidate financial data from multiple sources', 'Financial', '💰', true, NULL),
    ('Event Attendees', 'Manage event registration and attendee information', 'Events', '🎟️', true, NULL),
    ('Real Estate Listings', 'Standardize property information from multiple sources', 'Real Estate', '🏠', true, NULL);

-- Insert columns for Invoice Processing template
INSERT INTO public.schema_template_columns (template_id, name, data_type, is_required, position, sample_values)
SELECT 
    id,
    column_name,
    data_type,
    is_required,
    position,
    sample_values
FROM schema_templates,
LATERAL (VALUES 
    ('Invoice Number', 'text', true, 1, '["INV-001", "INV-002", "2024-0123"]'::jsonb),
    ('Invoice Date', 'date', true, 2, '["2024-01-15", "2024-02-20"]'::jsonb),
    ('Vendor Name', 'text', true, 3, '["ABC Corp", "XYZ Ltd"]'::jsonb),
    ('Total Amount', 'number', true, 4, '[1234.56, 5678.90]'::jsonb),
    ('Tax Amount', 'number', false, 5, '[123.45, 567.89]'::jsonb),
    ('Description', 'text', false, 6, '["Office supplies", "Consulting services"]'::jsonb),
    ('Due Date', 'date', false, 7, '["2024-02-15", "2024-03-20"]'::jsonb),
    ('Category', 'text', false, 8, '["Supplies", "Services", "Equipment"]'::jsonb)
) AS t(column_name, data_type, is_required, position, sample_values)
WHERE schema_templates.name = 'Invoice Processing';

-- Insert columns for Contact List template
INSERT INTO public.schema_template_columns (template_id, name, data_type, is_required, position, sample_values)
SELECT 
    id,
    column_name,
    data_type,
    is_required,
    position,
    sample_values
FROM schema_templates,
LATERAL (VALUES 
    ('First Name', 'text', true, 1, '["John", "Jane", "Bob"]'::jsonb),
    ('Last Name', 'text', true, 2, '["Doe", "Smith", "Johnson"]'::jsonb),
    ('Email', 'email', true, 3, '["john@example.com", "jane@company.com"]'::jsonb),
    ('Phone', 'phone', false, 4, '["555-1234", "(555) 123-4567"]'::jsonb),
    ('Company', 'text', false, 5, '["ABC Corp", "XYZ Ltd"]'::jsonb),
    ('Title', 'text', false, 6, '["CEO", "Manager", "Developer"]'::jsonb),
    ('Address', 'text', false, 7, '["123 Main St", "456 Oak Ave"]'::jsonb),
    ('City', 'text', false, 8, '["New York", "San Francisco"]'::jsonb),
    ('State', 'text', false, 9, '["NY", "CA"]'::jsonb),
    ('Zip Code', 'text', false, 10, '["10001", "94105"]'::jsonb)
) AS t(column_name, data_type, is_required, position, sample_values)
WHERE schema_templates.name = 'Contact List';

-- Create function to auto-create user preferences
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_preferences();

-- Update existing users
INSERT INTO public.user_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_preferences);

-- Indexes for performance
CREATE INDEX idx_schema_templates_category ON schema_templates(category);
CREATE INDEX idx_schema_templates_public ON schema_templates(is_public);
CREATE INDEX idx_mapping_history_user_columns ON mapping_history(user_id, source_column, target_column);
CREATE INDEX idx_schema_template_columns_template ON schema_template_columns(template_id);