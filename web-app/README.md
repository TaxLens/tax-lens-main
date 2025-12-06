# TaxLens - Web Application

Next.js frontend for the Spending Transaction Tracker.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

3. Run development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Pages

- `/` - Landing page with Google sign-in
- `/auth/callback` - OAuth callback handler
- `/dashboard` - Main dashboard with spending overview and sync button
- `/transactions` - Transaction list with filtering and editing
- `/settings` - Account settings and Gmail connection management

## Features

- **Google OAuth Login** - Secure authentication with Gmail integration
- **Gmail Sync** - One-click email scanning for transactions
- **AI Detection** - Claude-powered transaction recognition
- **Interactive Dashboard** - Charts and spending analytics
- **Transaction Management** - View, edit, and delete transactions
- **Category Filtering** - Filter by category, date range
- **Responsive Design** - Beautiful dark theme with animations

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Recharts (data visualization)
- Lucide React (icons)

