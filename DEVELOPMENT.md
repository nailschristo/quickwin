# QuickWin Development Guidelines

## Overview
QuickWin is a web application that helps users standardize and merge data from multiple file formats (CSV, PDF, images) into a unified schema. Users can define custom schemas and the system will intelligently map and merge data from various sources.

## Current Development Status
- **Phase**: Backend Processing Implemented (CSV Support)
- **Last Updated**: 2025-08-02
- **Active Branch**: main
- **Deployment**: Live on Vercel at https://quickwin-plum.vercel.app

## Technology Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage)
- **Processing**: Python serverless functions
- **Deployment**: Vercel
- **OCR/Parsing**: pdfplumber, pytesseract, pandas

## Development Priorities
1. **Phase 1**: Authentication and project setup
2. **Phase 2**: Schema management system
3. **Phase 3**: File upload and processing pipeline
4. **Phase 4**: Smart mapping engine
5. **Phase 5**: Output generation and export
6. **Phase 6**: Polish and launch

## Code Standards
### TypeScript
- Use strict type checking
- Define interfaces for all data structures
- Avoid `any` types

### React/Next.js
- Use functional components with hooks
- Implement proper error boundaries
- Optimize with React.memo where appropriate
- Use Next.js App Router

### Styling
- Tailwind CSS for all styling
- Mobile-first responsive design
- Consistent spacing and color scheme
- Subtle gradients and hover effects

### State Management
- React Context for global state
- Local state with useState/useReducer
- Optimistic UI updates

## Database Schema
### Tables (implemented)
- `users` - User accounts (Supabase Auth)
- `schemas` - User-defined schemas with source tracking
- `schema_columns` - Columns for each schema
- `jobs` - Processing jobs with status tracking
- `job_files` - Files uploaded for each job
- `column_mappings` - Column mappings for jobs
- `schema_templates` - Pre-built schema templates
- `schema_template_columns` - Columns for templates
- `user_preferences` - User settings and preferences

## API Design
### Endpoints (implemented)
- `/api/auth/*` - Authentication endpoints (Supabase)
- `/api/jobs/[id]/process` - Trigger job processing
- `/api/jobs/[id]/download` - Download processed Excel file
- `/api/process/csv` - Process CSV files
### Endpoints (to be implemented)
- `/api/process/excel` - Process Excel files
- `/api/process/pdf` - Process PDF files
- `/api/process/image` - Process images with OCR

## Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Test file processing with various formats

## Performance Considerations
- Lazy loading for large datasets
- Pagination for schema lists
- Efficient file processing with streaming
- Caching for repeated operations

## Security Guidelines
- Validate all user inputs
- Sanitize file uploads
- Use Supabase RLS for data access
- Never expose service keys
- Rate limiting on processing endpoints

## UI/UX Patterns

### Navigation
- Use the Header component (`@/components/layout/Header`) on all pages
- Dashboard shows "QuickWin" as clickable home link
- Sub-pages show back arrow and page title
- User email and sign out visible on all authenticated pages
- Primary action buttons placed in header

### Forms
- Clear validation messages
- Loading states for all actions
- Disable submit during processing
- Success/error notifications

### File Upload
- Drag and drop interface
- Progress indicators
- File type validation
- Preview before processing

### Schema Builder
- Visual column editor
- Drag to reorder columns
- Sample data preview
- Save/load templates

## Deployment Process
(To be defined when deployment is set up)

## Environment Variables
### Backend
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (for AI mapping)

### Frontend
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Common Commands
```bash
# Development
npm run dev

# Build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
```

## Troubleshooting
Common issues and solutions will be documented here as they arise.

## Feature Completion Checklist
- [x] User authentication (Email/Password + OAuth ready)
- [x] User profile system with Stripe-ready schema
- [x] Database schema with RLS policies
- [x] Storage buckets configured
- [x] Deployment to Vercel
- [x] Redesigned dashboard with project-based workflow
- [x] Multi-step job wizard (Schema → Upload → Map → Process)
- [x] Schema creation UI (builder interface)
- [x] File upload interface (drag-and-drop)
- [x] CSV parsing (backend)
- [ ] Excel parsing (backend)
- [ ] PDF parsing (backend)
- [ ] Image OCR (backend)
- [x] Column mapping UI (with AI confidence scores)
- [x] AI-assisted mapping (basic fuzzy matching)
- [x] Data merging (backend)
- [x] Export functionality (Excel download)
- [ ] Schema templates library
- [ ] Recent jobs history
- [ ] Usage limits
- [ ] Payment integration (database ready)