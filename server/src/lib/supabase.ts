import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database types
export interface User {
  id: string;
  email: string;
  name: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  email_id: string;
  merchant: string | null;
  amount: number | null;
  currency: string;
  category: string | null;
  tax_relief_category: string | null;
  transaction_date: string | null;
  email_subject: string | null;
  email_snippet: string | null;
  email_date: string | null;
  description: string | null;
  confidence_score: number | null;
  receipt_url: string | null;
  created_at: string;
}

