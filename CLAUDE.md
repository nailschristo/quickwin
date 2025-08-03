# Claude Development Guidelines - QuickWin

## Session Startup - READ FIRST

**At the start of every session, Claude Code should:**
1. **Reference this file (CLAUDE.md)** for deployment rules and AI guidelines
2. **Read SESSION_HANDOFF.md** for current project state and recent changes
3. **Read DEVELOPMENT.md** for comprehensive development guidelines
4. **Read ARCHITECTURE.md** for system design and data model
5. **Never ask about deployment procedures** - they're defined here
6. **Always push to GitHub after changes** - Vercel will auto-deploy
7. **Maintain documentation consistency** - see Documentation Maintenance section below
8. **Load smart context** - see Intelligent Context Rules section below

## CRITICAL BEHAVIOR RULES - CHECK BEFORE YOU ACT

**Before making ANY changes or creating ANY new files:**

1. **CHECK FIRST**: Always use Read, Grep, or Glob tools to check if the component/file/feature already exists
2. **UNDERSTAND CONTEXT**: Read related files to understand existing patterns and configurations
3. **VERIFY IMPORTS**: Check import paths and ensure they match existing project structure
4. **FOLLOW PATTERNS**: Match the existing code style and patterns in the codebase
5. **ASK IF UNSURE**: If user mentions a component/feature, check if it exists before creating new ones

**Example workflow:**
- User: "Add a delete button to SchemaCard"
- WRONG: Create new SchemaCard component
- RIGHT: First grep for "SchemaCard" to see if it exists, then read the file to understand its structure

**Common mistakes to avoid:**
- Creating duplicate components
- Using wrong import paths (e.g., @/utils vs @/lib)
- Not checking existing database schema before adding columns
- Creating new patterns when established patterns exist
- Not verifying if a feature already exists before implementing

**Required checks before action:**
```
Before creating a component: grep -r "ComponentName" .
Before adding a column: read the migration files
Before creating an API route: check existing API structure
Before modifying imports: verify the actual path exists
```

## Documentation Version Control

**Current Version**: v1.7 (2025-08-03)  
**Last Updated**: Updated session startup checklist and resolved 405 error with Edge Functions
**Next Review**: When Excel/PDF/Image processing is implemented

### Recent Documentation Changes
- **v1.7**: Updated session startup checklist to include all context files; resolved 405 error
- **v1.6**: Added Transformation System and 405 Error Troubleshooting sections
- **v1.5**: Updated with comprehensive transformation system using humanparser and fuse.js
- **v1.4**: Added Backend Processing section with file processing flow and API details
- **v1.3**: Updated Deployment Rules to use proper Git-based workflow instead of direct Vercel deployment
- **v1.2**: Added Navigation Guidelines section with Header component usage and navigation rules
- **v1.1**: Added CRITICAL BEHAVIOR RULES section to ensure proper checking before creating/modifying
- **v1.0**: Initial documentation 

## Deployment Rules

**DEPLOYMENT STRATEGY - GIT-BASED CI/CD:**

### Supabase Setup (Required First)
1. Create Supabase project at supabase.com
2. Run `/supabase/schema.sql` in SQL Editor
3. Run `/supabase/storage.sql` in SQL Editor
4. Copy project URL and anon key to `.env.local`
5. Configure OAuth providers if needed

### Local Development
```bash
npm install
npm run dev
```

### Deployment Workflow
**IMPORTANT: Follow proper Git-based deployment practices:**

1. **Commit changes locally:**
   ```bash
   git add -A
   git commit -m "Descriptive commit message"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Vercel Auto-Deploy:**
   - Vercel is connected to the GitHub repository
   - Pushing to `main` branch triggers automatic deployment
   - Monitor deployment at: https://vercel.com/tyler-nelsons-projects/quickwin

**Manual Deployment (ONLY if explicitly requested):**
```bash
npm run build
vercel --prod --yes
```

**Production URLs:**
- Frontend: https://quickwin-plum.vercel.app
- Supabase: https://zkcvhunldlpziwjhcjqt.supabase.co
- GitHub: https://github.com/nailschristo/quickwin

**Important Notes:**
- ALWAYS push to GitHub first - let Vercel auto-deploy from there
- Only use direct Vercel deployment for testing or when explicitly requested
- Check GitHub Actions or Vercel dashboard for deployment status
- Deploy database migrations to Supabase before pushing frontend changes

## Project Context

### Application Overview
QuickWin is a web-based SaaS application that helps users standardize and merge data from multiple file formats (CSV, PDF, images) into a unified schema. Users can define custom schemas, upload files from various sources, and the system intelligently maps and merges the data.

### Key Features
- User-defined schema creation and management
- Multi-format file upload (CSV, Excel, PDF, images)
- AI-powered column mapping with fuzzy matching
- Interactive mapping correction interface
- Automated data merging and transformation
- Export to CSV/Excel formats
- Template saving for repeated use

### Data Hierarchy
1. **Users** → Authentication and account management
2. **Schemas** → User-defined data structures
3. **Schema Columns** → Individual fields within schemas
4. **Jobs** → Processing sessions for file uploads
5. **Job Files** → Individual files within a job
6. **Column Mappings** → Mapping between source and target columns

### Development Preferences (Inherited from CMMS)
- Consistent styling across all pages (header, search/filters, cards)
- Mobile-friendly responsive design
- Performance optimization with useMemo
- Type safety with TypeScript
- Clean, minimal UI with subtle gradients and hover effects

## Documentation Maintenance

### Self-Maintaining Documentation System

**CRITICAL: When procedures, preferences, or standards change during a session:**

1. **Detect Changes**: If user requests different procedures than documented
2. **Ask for Documentation Updates**: 
   ```
   "I notice this differs from our documented procedures in [FILE]. 
   Should I update [CLAUDE.md/DEVELOPMENT.md] to reflect this change?"
   ```
3. **Update Appropriate Files**:
   - **Deployment changes** → Update both `CLAUDE.md` and `DEVELOPMENT.md`
   - **Development patterns** → Update `DEVELOPMENT.md`
   - **UI/UX preferences** → Update `DEVELOPMENT.md`
   - **Project priorities** → Update `DEVELOPMENT.md`
   - **New completed features** → Update `DEVELOPMENT.md`

4. **Maintain Consistency**: Ensure both files stay aligned

### File Hierarchy for Updates

1. **CLAUDE.md** - AI agent rules, deployment procedures, core guidelines
2. **DEVELOPMENT.md** - Comprehensive development guide, current state, priorities
3. **README.md** - Public-facing documentation
4. **ARCHITECTURE.md** - System design and data model documentation

## Architectural Decision Record (ADR)
Example format for ADRs
```
### ADR-001: AI-Powered Event Data Extraction (2025-01-31)
**Decision**: Use AI to scrape and parse event details from URLs  
**Rationale**: Manual data entry is time-consuming and error-prone  
**Impact**: Faster event creation, reduced errors, better UX  
**Status**: ✅ Planned  
``` 

## Intelligent Context Rules

**Load additional context based on task type:**

### Schema Work
- Check ARCHITECTURE.md → Data Model section
- Review schema versioning requirements
- Consider column type validations
- Reference existing schema patterns

### File Processing Work
- Check DEVELOPMENT.md → Processing Pipeline
- Review supported file formats
- Consider memory limitations
- Reference error handling patterns

### UI/UX Work
- Check DEVELOPMENT.md → UI/UX Patterns
- Follow established component patterns
- Ensure mobile responsiveness
- Maintain consistent styling

## Session Handoff System

### Triggering Session Handoff
**User commands that trigger handoff generation:**
- "Generate session handoff"
- "Prepare handoff prompt" 
- "Create next session prompt"
- "Session is ending, prepare handoff"

### Handoff Generation Process
When triggered, **completely replace** the contents of `SESSION_HANDOFF.md` with current session context and next steps.

## QuickWin-Specific Guidelines

### File Processing
- Always validate file types before processing
- Implement proper error handling for corrupted files
- Use streaming for large file processing
- Store both raw and processed data for debugging

### Schema Management
- Schemas should be versioned for backward compatibility
- Allow users to duplicate and modify existing schemas
- Provide sample schemas for common use cases
- Validate column names for compatibility

### AI Integration
- Use OpenAI for complex column mapping suggestions
- Provide confidence scores for all AI mappings
- Always allow manual override of AI decisions
- Cache AI responses to reduce API costs

### User Experience
- Show clear progress indicators during processing
- Provide preview of mapped data before final merge
- Allow undo/redo for mapping decisions
- Save mapping history for similar files

## Navigation Guidelines

### Consistent Header Pattern
All pages MUST include the Header component with appropriate navigation:

```tsx
import { Header } from '@/components/layout/Header'

// For main pages (Dashboard)
<Header title="QuickWin" user={user} />

// For sub-pages with back navigation
<Header 
  backUrl="/previous-page" 
  title="Page Title" 
  user={user}
  actions={<optional action buttons>}
/>
```

### Navigation Rules:
1. **Dashboard** - Shows "QuickWin" as clickable logo, includes user info and sign out
2. **List Pages** (e.g., /schemas) - Back arrow to dashboard, page title, action button
3. **Detail Pages** (e.g., /schemas/[id]) - Back arrow to list page, item name as title
4. **Create/Edit Pages** - Back arrow to previous page, descriptive title
5. **Multi-step Pages** (e.g., /jobs/new) - Back arrow, step indicator, cancel option

### Required Navigation Elements:
- Every page must have a way to navigate back or to dashboard
- User email and sign out should be visible on authenticated pages
- Action buttons (create, edit, etc.) should be in the header when appropriate
- Mobile-responsive navigation

## Infrastructure Notes
Example of infrastructure notes
```
**GitHub**: Repository: nailschristo/eventtracker-app  
**Vercel**: 
- Frontend Project: eventtracker_app_frontend
- Backend Project: eventtracker_app_backend
- Team: Tyler Nelson's Hobby account
**Supabase**: Project: eventtracker (us-east-1)  
**Branding**: Using Gridstream branding temporarily
```
## Backend Processing Implementation

### File Processing Flow (Current - Using Edge Functions)
1. **Job Creation**: Jobs are created when users reach the mapping step
2. **File Upload**: Files are stored in Supabase Storage bucket 'job-files'
3. **Column Detection**: CSV files are processed client-side to extract headers
4. **Mapping Storage**: User-selected column mappings are saved to database
5. **Edge Function Processing**: Supabase Edge Function processes and merges files
6. **Database Storage**: Processed data stored in `jobs.output_data` JSONB field
7. **Download**: CSV generated on-demand from database data

### API Endpoints
- **Supabase Edge Function**: `process-job` - Handles all file processing
- **GET /api/download** - Generates CSV from database and downloads
- **POST /api/process/excel** - Process Excel files (TODO)
- **POST /api/process/pdf** - Process PDF files (TODO)
- **POST /api/process/image** - Process images with OCR (TODO)

### Important Implementation Notes
- Server-side `createClient()` doesn't take parameters - it handles cookies internally
- CSV processing happens client-side for column detection
- Job status tracking: 'pending' → 'processing' → 'completed' or 'failed'
- CSV export generated on-demand from database-stored data
- Column mappings support confidence scores and transformation configs
- Edge Functions use Deno runtime and require service role for database access
- Processed data stored as JSONB in `jobs.output_data` field

### Schema Source Tracking
- Schemas now track their source: 'manual', 'template', or 'import'
- Only manually created schemas appear in "Use Recent Schema" option
- `last_used_at` is automatically updated when jobs are created

## Critical Environment Variables

**Set in Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=https://zkcvhunldlpziwjhcjqt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key from Supabase]
SUPABASE_SERVICE_ROLE_KEY=[service role key from Supabase]
SUPABASE_JWT_SECRET=[JWT secret from Supabase]
```

**Supabase Credentials:**
- Project Ref: zkcvhunldlpziwjhcjqt
- Database Password: I#9winesdaily
- CLI Access Token: sbp_854e8fcd32a1426f7f8efc638a64c1cc560d3fba

## Transformation System

### Overview
QuickWin uses an intelligent transformation system to handle data mapping between different formats:
- **humanparser**: Intelligent name parsing (handles prefixes, suffixes, middle names)
- **fuse.js**: Fuzzy column matching with confidence scores
- **TransformationDetector**: Automatically detects split/combine/format transformations
- **TransformationEngine**: Applies transformations during export

### Supported Transformations
1. **Name Transformations**
   - Split: "John Doe" → First: "John", Last: "Doe"
   - Combine: First + Last → "John Doe"
   - Smart parsing: "Dr. John Smith Jr." → properly parsed components

2. **Address Transformations** (defined, not yet UI-enabled)
   - Split full address into street/city/state/zip
   - Extract zip codes

3. **Phone Transformations** (defined, not yet UI-enabled)
   - Clean and format phone numbers

### Architecture
```typescript
// Detection
const detector = new TransformationDetector(sourceColumns, targetColumns)
const transformations = detector.detectTransformations()

// Application
const result = await TransformationEngine.transform(
  sourceRow,
  transformation.sourceColumns,
  transformation.config
)
```

## 405 Error Resolution (RESOLVED ✅)

### Original Problem
- `/api/jobs/[id]/process` returned 405 Method Not Allowed on Vercel
- Worked locally but failed in production
- Blocked entire processing flow

### Solution Implemented
- **Moved processing to Supabase Edge Functions** instead of Vercel API routes
- Created `process-job` Edge Function that handles all file processing
- Edge Function runs in Deno runtime and has direct database access
- ProcessingStep component now calls Edge Function endpoint directly

### Key Learnings
1. Vercel has issues with dynamic API routes in Next.js 14 App Router
2. Supabase Edge Functions provide more reliable serverless execution
3. Edge Functions can access Supabase services directly with service role
4. Storing processed data in database is more reliable than file storage

### Current Implementation
```typescript
// Frontend call to Edge Function
const response = await fetch(`${supabaseUrl}/functions/v1/process-job`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
  body: JSON.stringify({ jobId })
})

// Processed data stored in jobs.output_data JSONB field
// CSV generated on-demand during download
```
---
