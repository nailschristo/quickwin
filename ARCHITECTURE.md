# QuickWin System Architecture

## Overview
QuickWin is a web-based SaaS application that enables users to standardize and merge data from multiple file formats (CSV, PDF, images) into a unified schema.

## System Components

### Frontend (Next.js)
```
┌─────────────────────────────────────────┐
│           Next.js Frontend              │
│  ┌─────────────┐    ┌─────────────┐    │
│  │    Pages    │    │ Components  │    │
│  │  - Auth     │    │ - Schema    │    │
│  │  - Dashboard│    │ - Upload    │    │
│  │  - Schema   │    │ - Mapping   │    │
│  │  - Jobs     │    │ - Export    │    │
│  └─────────────┘    └─────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │        State Management         │   │
│  │    (React Context + Hooks)      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Backend Architecture
```
┌─────────────────────────────────────────┐
│              Supabase                   │
│  ┌─────────────┐    ┌─────────────┐    │
│  │    Auth     │    │  Database   │    │
│  │  - Email    │    │  - Users    │    │
│  │  - OAuth    │    │  - Schemas  │    │
│  └─────────────┘    │  - Jobs     │    │
│                     │  - Mappings │    │
│  ┌─────────────┐    └─────────────┘    │
│  │   Storage   │                       │
│  │  - job-files│    ┌─────────────┐    │
│  │  - exports  │    │Edge Functions│    │
│  └─────────────┘    │- process-job│    │
│                     └─────────────┘    │
└─────────────────────────────────────────┘
```

### Processing Pipeline (Current Implementation)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   File Upload   │────▶│Column Detection │────▶│  User Mapping   │
│  (CSV files)    │     │  - Parse CSV    │     │  - Manual map   │
└─────────────────┘     │  - Extract cols │     │  - Transform    │
                        └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Download CSV   │◀────│  Store in DB    │◀────│Edge Function    │
│  (Generated)    │     │  - output_data  │     │  - process-job  │
└─────────────────┘     │  - JSONB field  │     │  - Merge files  │
                        └─────────────────┘     │  - Apply trans  │
                                                └─────────────────┘
```

## Data Model

### Core Entities
```sql
-- Users (managed by Supabase Auth + custom profile)
users {
  id: uuid (PK)
  email: string
  full_name: string
  avatar_url: string
  stripe_customer_id: string
  stripe_subscription_id: string
  subscription_status: enum
  subscription_tier: enum
  trial_ends_at: timestamp
  created_at: timestamp
  updated_at: timestamp
}

-- User-defined schemas
schemas {
  id: uuid (PK)
  user_id: uuid (FK)
  name: string
  description: text
  created_at: timestamp
  updated_at: timestamp
}

-- Schema columns
schema_columns {
  id: uuid (PK)
  schema_id: uuid (FK)
  name: string
  data_type: string
  position: integer
  sample_values: jsonb
  created_at: timestamp
}

-- Processing jobs
jobs {
  id: uuid (PK)
  user_id: uuid (FK)
  schema_id: uuid (FK)
  status: enum (pending, processing, completed, failed)
  output_file_path: text -- Path to output file (legacy)
  output_data: jsonb -- Processed data stored in DB
  metadata: jsonb -- Job metadata (rows processed, etc)
  created_at: timestamp
  completed_at: timestamp
}

-- Uploaded files
job_files {
  id: uuid (PK)
  job_id: uuid (FK)
  file_name: string
  file_type: string
  file_url: string
  raw_data: jsonb
  processed_data: jsonb
  created_at: timestamp
}

-- Column mappings
column_mappings {
  id: uuid (PK)
  job_id: uuid (FK)
  job_file_id: uuid (FK) -- References job_files
  source_columns: text[] -- Array for multi-column mappings
  target_column: string
  transformation_type: string -- split, combine, etc
  transformation_config: jsonb -- Transformation settings
  confidence: float
  mapping_type: enum (exact, fuzzy, ai, manual)
  created_at: timestamp
}
```

## API Design

### RESTful Endpoints
```
Authentication:
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/user

Schemas:
GET    /api/schemas
POST   /api/schemas
GET    /api/schemas/:id
PUT    /api/schemas/:id
DELETE /api/schemas/:id
GET    /api/schemas/:id/columns
POST   /api/schemas/:id/columns

Jobs:
GET    /api/jobs
POST   /api/jobs
GET    /api/jobs/:id
POST   /api/jobs/:id/files
GET    /api/jobs/:id/mappings
PUT    /api/jobs/:id/mappings
POST   /api/jobs/:id/process
GET    /api/jobs/:id/export

Files:
POST   /api/files/upload
GET    /api/files/:id
DELETE /api/files/:id
```

## Processing Flow

### File Processing Pipeline (As Implemented)
1. **Upload**: User uploads CSV files through frontend
2. **Storage**: Files stored in Supabase Storage `job-files` bucket
3. **Column Detection**: Client-side CSV parsing to extract headers
4. **Mapping**: User manually maps columns with transformation detection
5. **Edge Function**: Supabase Edge Function `process-job` handles merging
6. **Database Storage**: Processed data stored in `jobs.output_data` JSONB field
7. **Download**: CSV generated on-demand from database data

### Column Mapping Strategy (As Implemented)
1. **Fuzzy Match**: Using Fuse.js for intelligent matching
2. **Transformation Detection**: Automatic detection of:
   - Name splitting (Full Name → First/Last)
   - Name combining (First/Last → Full Name)
   - Using humanparser for intelligent name parsing
3. **Manual Selection**: User confirms all mappings
4. **Future**: OpenAI API for complex matches

## Security Architecture

### Authentication & Authorization
- Supabase Auth for user management
- Row Level Security (RLS) on all tables
- API routes protected by auth middleware
- File access controlled by signed URLs

### Data Security
- All files encrypted at rest
- HTTPS for all communications
- Sanitization of all user inputs
- Rate limiting on processing endpoints

## Scalability Considerations

### Performance Optimization
- Lazy loading for large datasets
- Pagination on all list endpoints
- Background processing for large files
- Caching of processed results

### Infrastructure Scaling
- Vercel automatic scaling for frontend
- Supabase handles database scaling
- Serverless functions for processing
- CDN for static assets

## Technology Decisions

### Frontend
- **Next.js 14**: Modern React framework with SSR
- **TypeScript**: Type safety and better DX
- **Tailwind CSS**: Rapid UI development
- **React Query**: Efficient data fetching

### Backend
- **Supabase**: Complete backend solution
- **PostgreSQL**: Reliable relational database
- **Python**: Best libraries for file processing
- **Vercel Functions**: Serverless computing

### File Processing
- **pandas**: CSV and Excel processing
- **pdfplumber**: PDF text extraction
- **pytesseract**: OCR for images
- **OpenAI API**: Intelligent mapping

## Deployment Architecture
```
┌─────────────────┐     ┌─────────────────┐
│     Vercel      │     │    Supabase     │
│   (Frontend)    │◀───▶│   (Backend)     │
│                 │     │                 │
│  - Next.js App  │     │  - PostgreSQL   │
│  - API Routes   │     │  - Auth         │
│  - Edge Funcs   │     │  - Storage      │
└─────────────────┘     └─────────────────┘
```

## Monitoring & Observability
- Vercel Analytics for frontend metrics
- Supabase Dashboard for backend monitoring
- Error tracking with Sentry (planned)
- Usage metrics for billing

## Future Considerations
- Multi-tenant architecture for enterprise
- Advanced AI models for better mapping
- Real-time collaboration features
- API for third-party integrations
- Mobile applications