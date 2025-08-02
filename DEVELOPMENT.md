# QuickWin Development Guidelines

## Overview
QuickWin is a web application that helps users standardize and merge data from multiple file formats (CSV, PDF, images) into a unified schema. Users can define custom schemas and the system will intelligently map and merge data from various sources.

## Current Development Status
- **Phase**: Initial setup
- **Last Updated**: 2025-08-02
- **Active Branch**: main

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
### Tables (to be implemented)
- `users` - User accounts
- `schemas` - User-defined schemas
- `schema_columns` - Columns for each schema
- `jobs` - Processing jobs
- `job_files` - Files uploaded for each job
- `mappings` - Column mappings for jobs

## API Design
### Endpoints (to be implemented)
- `/api/auth/*` - Authentication endpoints
- `/api/schemas/*` - Schema CRUD operations
- `/api/jobs/*` - Job processing
- `/api/files/*` - File upload/download
- `/api/process/*` - File processing endpoints

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
- [ ] User authentication
- [ ] Schema creation UI
- [ ] File upload interface
- [ ] CSV parsing
- [ ] PDF parsing
- [ ] Image OCR
- [ ] Column mapping UI
- [ ] AI-assisted mapping
- [ ] Data merging
- [ ] Export functionality
- [ ] User dashboard
- [ ] Usage limits
- [ ] Payment integration