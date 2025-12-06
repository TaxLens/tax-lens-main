-- Add tax relief category and description columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tax_relief_category TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for tax relief category
CREATE INDEX IF NOT EXISTS idx_transactions_tax_relief ON transactions(tax_relief_category);

