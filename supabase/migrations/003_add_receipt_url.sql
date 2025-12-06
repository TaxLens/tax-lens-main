-- Add receipt_url column to transactions table
-- This stores the URL to the receipt image in Supabase Storage

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create index for faster queries on receipts
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url ON transactions(receipt_url) WHERE receipt_url IS NOT NULL;

