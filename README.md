# QuickWin - Smart Data Standardization

QuickWin helps you standardize and merge data from multiple file formats (CSV, PDF, images) into a unified schema.

## 🚀 Deployment

This app is designed to be deployed on Vercel with Supabase as the backend.

### Environment Variables

Set these in your Vercel dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

## 📋 Features

- ✅ User authentication (email/password + OAuth)
- ✅ Database schema with Row Level Security
- ✅ File storage configuration
- 🚧 Schema creation and management
- 🚧 File upload and processing
- 🚧 Smart column mapping
- 🚧 Data export

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage)
- **Deployment**: Vercel
- **Processing**: Python serverless functions (coming soon)
- **AI**: OpenAI API for smart mapping (coming soon)

## 📖 Documentation

- [`DEVELOPMENT.md`](./DEVELOPMENT.md) - Development guidelines
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - System design and data model
- [`CLAUDE.md`](./CLAUDE.md) - AI assistant guidelines

## 🏗️ Local Development

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and add your credentials
3. Install dependencies: `npm install`
4. Run migrations: `supabase db push`
5. Start dev server: `npm run dev`

## 📄 License

[Add your license here]