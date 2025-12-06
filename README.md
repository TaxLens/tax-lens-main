# TaxLens - AI-Driven Tax Automation Platform 

**⚠️ IMPORTANT: PLEASE READ THE [TESTING GUIDE](TESTING.md) FIRST ⚠️**

**Judges/Testers must use the provided test account to fully experience the application features.**

[👉 Click here for Test Account Credentials & Instructions](TESTING.md)

> **Note:** As this is a Hackathon MVP, the app is currently unverified by Google. Access to sensitive Gmail permissions requires manual whitelisting of test users. Please use the provided test account to avoid access errors.

---

Track your spending automatically by connecting your Gmail. TaxLens uses Claude AI to detect transactions from receipts, invoices, and payment confirmations in your emails.

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

---

## Quick Start Guide

### Prerequisites

- Node.js 18+ installed
- A Gmail account
- (You'll create the other accounts in the steps below)

---

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd tax-lens-main

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../web-app
npm install
```

---

### Step 2: Set Up Supabase (Database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **"New Project"** and create a project
3. Wait for the project to initialize (~2 minutes)
4. Go to **SQL Editor** in the left sidebar
5. Click **"New query"** and paste this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  merchant TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  category TEXT,
  transaction_date DATE,
  email_subject TEXT,
  email_snippet TEXT,
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

6. Click **"Run"** - you should see "Success. No rows returned"
7. Go to **Project Settings** → **API** and copy:
   - **Project URL** (for `SUPABASE_URL`)
   - **service_role key** (for `SUPABASE_SERVICE_KEY`)

---

### Step 3: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. **Enable Gmail API:**
   - Go to **APIs & Services** → **Library**
   - Search for "Gmail API" and click **Enable**
4. **Configure OAuth Consent Screen:**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Choose "External" and click Create
   - Fill in App name, User support email, Developer email
   - Click **Save and Continue** through the steps
   - On "Test users", click **Add Users** and add your Gmail address
5. **Create OAuth Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Add Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
   - Click **Create**
   - Copy the **Client ID** and **Client Secret**

---

### Step 4: Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account or sign in
3. Go to **Settings** → **API Keys**
4. Click **Create Key** and copy the key

---

### Step 5: Configure Environment Variables

**Backend (`server/.env`):**

```bash
cd server
```

Create a file named `.env` with:

```env
# Server Configuration
PORT=3001

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# JWT Configuration (generate a random string, min 32 characters)
JWT_SECRET=your_random_secret_key_at_least_32_characters

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Frontend (`web-app/.env.local`):**

```bash
cd web-app
```

Create a file named `.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

### Step 6: Run the Application

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
You should see: `Server running on http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd web-app
npm run dev
```
You should see: `Ready on http://localhost:3000`

---

### Step 7: Use the App

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click **"Sign in with Google"**
3. Select your Google account and grant permissions
4. Once logged in, click **"Sync Gmail"** to scan your emails
5. View detected transactions in the dashboard!

---

## Troubleshooting

### "Error 403: access_denied" when signing in
- Your Google OAuth app is in testing mode
- Go to Google Cloud Console → OAuth consent screen → Test users
- Add your Gmail address as a test user

### "redirect_uri_mismatch" error
- The redirect URI in Google Console must exactly match: `http://localhost:3001/api/auth/google/callback`
- No trailing slash, must be `http` not `https`

### Backend won't start
- Make sure all environment variables are set in `server/.env`
- Check that Supabase URL and keys are correct

### No transactions detected
- Make sure you have receipt/invoice emails in your Gmail
- The AI looks for emails with keywords like "receipt", "invoice", "payment", "order"

---

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

## Performance Benchmarks

Real-world performance metrics from scanning 200 emails:

```
📈 SYNC SUMMARY:
   Emails fetched: 200
   Emails analyzed: 200
   Transactions found: 17
   Conversion rate: 8.5%

⏱️  PERFORMANCE:
   Claude Analysis: 317.45s | 0.63 emails/sec
   Database Insert: 0.14s | 124.09 items/sec
   Total Sync Time: 389.06s (~6.5 minutes for 200 emails)
   Total inbox scan rate: 0.51 emails/sec

📊 AI CONFIDENCE:
   Average: 93.2%
   Median:  95.0%
   Range:   70% - 100%
   Distribution: 🟢 High (≥80%): 16 | 🟡 Medium (60-80%): 1 | 🔴 Low (<60%): 0
```

## Security & Privacy

- **Read-only access** - We only read emails, never send or modify
- **Minimal data storage** - Only transaction metadata is stored
- **Secure tokens** - OAuth tokens are encrypted in database
- **You control** - Revoke access anytime from Google Account settings

## License

MIT
