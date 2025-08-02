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
│  │  - Files    │    ┌─────────────┐    │
│  │  - Exports  │    │  Functions  │    │
│  └─────────────┘    │  - Triggers │    │
│                     └─────────────┘    │
└─────────────────────────────────────────┘
```

### Processing Pipeline
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   File Upload   │────▶│  File Parser    │────▶│  Data Extractor │
│  (Multi-format) │     │  - CSV: pandas  │     │  - Normalize    │
└─────────────────┘     │  - PDF: pdfplum │     │  - Structure    │
                        │  - IMG: OCR     │     └─────────────────┘
                        └─────────────────┘              │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Export File   │◀────│  Data Merger    │◀────│  Schema Mapper  │
│  (CSV/XLSX)     │     │  - Combine      │     │  - Fuzzy Match  │
└─────────────────┘     │  - Transform    │     │  - AI Assist    │
                        └─────────────────┘     │  - User Confirm │
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
  file_id: uuid (FK)
  source_column: string
  target_column: string
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

### File Processing Pipeline
1. **Upload**: User uploads files through frontend
2. **Storage**: Files stored in Supabase Storage
3. **Parse**: Serverless function triggered to parse file
4. **Extract**: Data extracted based on file type
5. **Normalize**: Data converted to standard format
6. **Map**: Columns mapped to user schema
7. **Review**: User reviews and adjusts mappings
8. **Merge**: All files merged according to schema
9. **Export**: Final file generated and downloadable

### Column Mapping Strategy
1. **Exact Match**: Direct string comparison
2. **Fuzzy Match**: Using Levenshtein distance
3. **AI-Assisted**: OpenAI API for complex matches
4. **Manual Override**: User can correct any mapping

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