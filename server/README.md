# TaxLens - Backend Server

Node.js/Express backend for the TaxLens Malaysian Tax Relief Tracker application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```env
# ===========================================
# Server Configuration
# ===========================================
PORT=3001
NODE_ENV=development

# ===========================================
# Frontend URL (for CORS and redirects)
# ===========================================
FRONTEND_URL=http://localhost:3000
WEB_APP_URL=http://localhost:3000

# ===========================================
# Google OAuth Configuration
# Get from: https://console.cloud.google.com/apis/credentials
# ===========================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# ===========================================
# Supabase Configuration
# Get from: https://supabase.com/dashboard/project/_/settings/api
# ===========================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# ===========================================
# Anthropic API Configuration (Claude AI)
# Get from: https://console.anthropic.com/account/keys
# ===========================================
ANTHROPIC_API_KEY=sk-ant-xxxxx

# ===========================================
# OpenAI API Configuration (for embeddings)
# Get from: https://platform.openai.com/api-keys
# Required for: RAG system, TaxGPT, document indexing
# ===========================================
OPENAI_API_KEY=sk-xxxxx

# ===========================================
# Pinecone Vector Database Configuration
# Get from: https://app.pinecone.io/
# Required for: RAG system, tax document storage
# ===========================================
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=taxlens-tax-rules

# ===========================================
# JWT Configuration
# Generate a secure random string (min 32 characters)
# ===========================================
JWT_SECRET=your_jwt_secret_key_min_32_characters_long

# ===========================================
# Resend Email Configuration (Optional)
# Get from: https://resend.com/api-keys
# Required for: Email notifications
# ===========================================
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=TaxLens <noreply@yourdomain.com>
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment mode (development/production) |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `WEB_APP_URL` | No | Web app URL for email links |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | OAuth callback URL |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI analysis |
| `OPENAI_API_KEY` | No* | OpenAI key for embeddings (*required for RAG) |
| `PINECONE_API_KEY` | No* | Pinecone key (*required for RAG) |
| `PINECONE_INDEX` | No | Pinecone index name (default: taxlens-tax-rules) |
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `RESEND_API_KEY` | No | Resend API key for emails |
| `RESEND_FROM_EMAIL` | No | From email address |

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Get Google OAuth URL
- `GET /api/auth/google/callback` - OAuth callback handler
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout (requires auth)

### Gmail Sync
- `POST /api/gmail/sync` - Sync emails and analyze for transactions (requires auth)
- `GET /api/gmail/status` - Get sync status (requires auth)

#### Performance Optimizations

The Gmail sync process has been optimized for speed:

| Optimization | Before | After | Impact |
|--------------|--------|-------|--------|
| Gmail fetch | Sequential (1 at a time) | Parallel batches of 25 | ~70% faster |
| Claude analysis batch size | 5 concurrent | 12 concurrent | ~40% faster |
| Inter-batch delay | 1000ms | 150ms | ~35s saved per 200 emails |
| RAG tax rules query | Per email | Cached once per sync | Eliminates N-1 queries |

**Expected sync times:**
- 200 emails: ~1-1.5 minutes (previously ~3-4 minutes)

#### Privacy-Safe Logging

All server logs mask sensitive email data for privacy:
- Email addresses: `jo***@gmail.com`
- Subjects: Truncated to 30 characters
- Merchant names: First word only for multi-word names
- Message IDs: Truncated to first 8 characters

Logs only show aggregate metrics (batch progress, transaction counts, confidence scores) without exposing personal email content.

### Transactions
- `GET /api/transactions` - List transactions (supports filtering)
- `GET /api/transactions/:id` - Get single transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/stats/summary` - Get transaction summary

### Receipts
- `POST /api/receipts/scan` - Upload and analyze a receipt image
- `POST /api/receipts/create` - Create transaction from scanned receipt

### Files
- `GET /api/files` - List all receipt files by year
- `GET /api/files/:year` - List receipts for a specific year
- `GET /api/files/download/:year` - Download all receipts for a year as ZIP

### Tax Documents (RAG)
- `GET /api/tax-documents/status` - Check RAG system configuration
- `POST /api/tax-documents/upload` - Upload tax rule PDF document
- `GET /api/tax-documents` - List all indexed documents
- `DELETE /api/tax-documents/:id` - Delete a document
- `POST /api/tax-documents/query` - Test RAG query

### TaxGPT
- `POST /api/taxgpt/chat` - Chat with TaxGPT assistant

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Gmail API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure consent screen
6. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
7. Copy Client ID and Client Secret to your `.env` file

## Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install --include=dev && npm run build`
4. Set start command: `npm start`
5. Add all environment variables from above
6. Update `GOOGLE_REDIRECT_URI` to use your Render URL
