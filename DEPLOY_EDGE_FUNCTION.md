# Deploy Supabase Edge Function

To deploy the process-job Edge Function, run these commands:

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref zkcvhunldlpziwjhcjqt

# Deploy the function
supabase functions deploy process-job

# Test the function (optional)
supabase functions invoke process-job --body '{"jobId":"test"}'
```

The function will be available at:
`https://zkcvhunldlpziwjhcjqt.supabase.co/functions/v1/process-job`