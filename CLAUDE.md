# Claude Development Guidelines - QuickWin

## Session Startup - READ FIRST

**At the start of every session, Claude Code should:**
1. **Reference this file (CLAUDE.md)** for deployment rules and AI guidelines
2. **Read DEVELOPMENT.md** for comprehensive development guidelines  
3. **Never ask about deployment procedures** - they're defined here
4. **Always deploy immediately after changes** so user can test
5. **Maintain documentation consistency** - see Documentation Maintenance section below
6. **Load smart context** - see Intelligent Context Rules section below

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

**Current Version**: v1.1 (2025-08-02)  
**Last Updated**: Added critical behavior rules for checking before acting
**Next Review**: When backend processing is implemented

### Recent Documentation Changes
- **v1.1**: Added CRITICAL BEHAVIOR RULES section to ensure proper checking before creating/modifying
- **v1.0**: Initial documentation 

## Deployment Rules

**DEPLOYMENT STRATEGY - LIVE IN PRODUCTION:**

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

### Deployment to Vercel
```bash
npm run build
vercel --prod
```

**Production URLs:**
- Frontend: https://quickwin-plum.vercel.app
- Supabase: https://zkcvhunldlpziwjhcjqt.supabase.co
- GitHub: https://github.com/nailschristo/quickwin

**Important Notes:**
- Always deploy immediately after making changes so user can test
- Deploy backend first if both frontend and backend changes are made

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
---
