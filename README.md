# SpendLens - AI-Powered Spending Tracker

Track your spending automatically by connecting your Gmail. SpendLens uses Claude AI to detect transactions from receipts, invoices, and payment confirmations in your emails.

## Features

- **Gmail Integration** - Securely connect your Gmail to scan for transactions
- **AI Transaction Detection** - Claude AI analyzes emails to identify spending
- **Beautiful Dashboard** - View spending summaries with interactive charts
- **Category Management** - Auto-categorized transactions (food, transport, shopping, etc.)
- **Transaction History** - Browse, filter, and edit detected transactions
- **Privacy Focused** - Read-only email access, data stays secure

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│  Express API    │───▶│    Supabase     │
│   (web-app/)    │    │   (server/)     │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             ┌───────────┐       ┌───────────┐
             │ Gmail API │       │ Claude API│
             └───────────┘       └───────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- A Supabase project
- Google Cloud project with OAuth credentials and Gmail API enabled
- Anthropic API key

### 1. Set Up Supabase

Create a new Supabase project and run the migration:

```sql
-- Run in Supabase SQL Editor
-- See supabase/migrations/001_initial_schema.sql for full schema
```

### 2. Configure Backend

```bash
cd server
npm install

# Create .env file with:
# PORT=3001
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
# SUPABASE_URL=your_supabase_project_url
# SUPABASE_SERVICE_KEY=your_supabase_service_role_key
# ANTHROPIC_API_KEY=your_anthropic_api_key
# JWT_SECRET=your_jwt_secret_min_32_chars
# FRONTEND_URL=http://localhost:3000

npm run dev
```

### 3. Configure Frontend

```bash
cd web-app
npm install

# Create .env.local file with:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api

npm run dev
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Gmail API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen
6. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
7. Copy Client ID and Client Secret to your backend `.env`

## Project Structure

```
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── routes/        # API routes
│   │   │   ├── auth.ts    # Google OAuth endpoints
│   │   │   ├── gmail.ts   # Gmail sync endpoints
│   │   │   └── transactions.ts
│   │   ├── services/      # Business logic
│   │   │   ├── gmail.service.ts
│   │   │   └── claude.service.ts
│   │   ├── middleware/    # Auth middleware
│   │   └── lib/           # Utilities
│   └── package.json
│
├── web-app/               # Next.js frontend
│   ├── src/
│   │   ├── app/          # App router pages
│   │   │   ├── page.tsx  # Landing/login
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   └── settings/
│   │   ├── components/   # React components
│   │   ├── context/      # Auth context
│   │   └── lib/          # API client, utilities
│   └── package.json
│
└── supabase/
    └── migrations/       # Database schema
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth 2.0 |
| AI | Claude (Anthropic API) |
| Email | Gmail API |

## How It Works

1. **Sign in** with your Google account
2. **Grant access** to read your Gmail (read-only)
3. **Click Sync** to scan recent emails for transactions
4. Claude AI analyzes each email and extracts:
   - Merchant name
   - Transaction amount
   - Date
   - Category
5. **View** your transactions in the dashboard
6. **Edit** or delete any incorrectly detected transactions

## Security & Privacy

- **Read-only access** - We only read emails, never send or modify
- **Minimal data storage** - Only transaction metadata is stored
- **Secure tokens** - OAuth tokens are encrypted in database
- **You control** - Revoke access anytime from Google Account settings

## License

MIT
