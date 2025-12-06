# TaxLens - Backend Server

Node.js/Express backend for the Spending Transaction Tracker application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```env
# Server Configuration
PORT=3001

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_min_32_characters_long

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:3000
```

3. Run development server:
```bash
npm run dev
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

### Transactions
- `GET /api/transactions` - List transactions (supports filtering)
- `GET /api/transactions/:id` - Get single transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/stats/summary` - Get transaction summary

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Gmail API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure consent screen
6. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
7. Copy Client ID and Client Secret to your `.env` file
