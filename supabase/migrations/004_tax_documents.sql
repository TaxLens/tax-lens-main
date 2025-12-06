-- Create tax_documents table for storing document metadata
-- Actual vectors are stored in Pinecone

CREATE TABLE IF NOT EXISTS tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster year-based queries
CREATE INDEX IF NOT EXISTS idx_tax_documents_year ON tax_documents(year);

-- Add comment for documentation
COMMENT ON TABLE tax_documents IS 'Stores metadata for tax rule PDF documents. Vectors are stored in Pinecone.';

