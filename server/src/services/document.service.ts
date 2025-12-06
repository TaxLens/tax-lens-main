import pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  upsertVectors,
  queryVectors,
  deleteVectorsByDocumentId,
  TaxRuleChunk,
  QueryResult,
  isPineconeConfigured,
  EMBEDDING_DIMENSION,
} from '../lib/pinecone.js';
import { supabase } from '../lib/supabase.js';

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration
const CHUNK_SIZE = 500; // tokens (approximate)
const CHUNK_OVERLAP = 50; // tokens overlap between chunks

/**
 * Parse PDF buffer and extract text
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Split text into chunks with overlap
 */
export function chunkDocument(
  text: string,
  metadata: { documentId: string; filename: string; year: number }
): TaxRuleChunk[] {
  // Clean and normalize text
  const cleanedText = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  // Simple sentence-based chunking
  const sentences = cleanedText.split(/(?<=[.!?])\s+/);
  const chunks: TaxRuleChunk[] = [];
  
  let currentChunk = '';
  let chunkIndex = 0;
  const approximateTokensPerChar = 0.25; // rough estimate

  for (const sentence of sentences) {
    const potentialChunk = currentChunk + ' ' + sentence;
    const estimatedTokens = potentialChunk.length * approximateTokensPerChar;

    if (estimatedTokens > CHUNK_SIZE && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: `${metadata.documentId}_chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        metadata: {
          ...metadata,
          chunkIndex,
          totalChunks: 0, // Will be updated later
        },
      });
      chunkIndex++;

      // Start new chunk with overlap (include last few sentences)
      const overlapSentences = currentChunk.split(/(?<=[.!?])\s+/).slice(-2).join(' ');
      currentChunk = overlapSentences + ' ' + sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${metadata.documentId}_chunk_${chunkIndex}`,
      text: currentChunk.trim(),
      metadata: {
        ...metadata,
        chunkIndex,
        totalChunks: 0,
      },
    });
  }

  // Update total chunks count
  const totalChunks = chunks.length;
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = totalChunks;
  }

  return chunks;
}

/**
 * Generate embeddings for text chunks using OpenAI
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: texts,
    dimensions: 1024, // Truncate to match Pinecone index dimension
  });

  return response.data.map((item) => item.embedding);
}

/**
 * Process and index a PDF document
 */
export async function indexDocument(
  buffer: Buffer,
  filename: string,
  year: number,
  description?: string
): Promise<{ documentId: string; chunkCount: number }> {
  if (!isPineconeConfigured()) {
    throw new Error('Pinecone not configured');
  }

  const documentId = uuidv4();

  console.log(`📄 Processing document: ${filename}`);

  // Parse PDF
  const text = await parsePdf(buffer);
  console.log(`   Extracted ${text.length} characters`);

  // Chunk document
  const chunks = chunkDocument(text, { documentId, filename, year });
  console.log(`   Created ${chunks.length} chunks`);

  // Generate embeddings
  const chunkTexts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(chunkTexts);
  console.log(`   Generated ${embeddings.length} embeddings`);

  // Prepare vectors for Pinecone
  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      ...chunk.metadata,
      text: chunk.text,
    },
  }));

  // Upsert to Pinecone
  await upsertVectors(vectors);
  console.log(`   Indexed ${vectors.length} vectors in Pinecone`);

  // Store document metadata in Supabase
  const { error } = await supabase.from('tax_documents').insert({
    id: documentId,
    filename,
    year,
    description,
    chunk_count: chunks.length,
  });

  if (error) {
    console.error('Error storing document metadata:', error);
    // Clean up Pinecone vectors if Supabase insert fails
    await deleteVectorsByDocumentId(documentId, chunks.length);
    throw new Error('Failed to store document metadata');
  }

  console.log(`✅ Document indexed successfully: ${documentId}`);

  return { documentId, chunkCount: chunks.length };
}

/**
 * Query tax rules by semantic search
 */
export async function queryTaxRules(
  query: string,
  year?: number,
  topK: number = 5
): Promise<string> {
  if (!isPineconeConfigured() || !process.env.OPENAI_API_KEY) {
    console.log('RAG not configured, using default tax rules');
    return '';
  }

  try {
    // Generate embedding for query
    const [queryEmbedding] = await generateEmbeddings([query]);

    // Query Pinecone
    const results = await queryVectors(queryEmbedding, topK, year ? { year } : undefined);

    if (results.length === 0) {
      return '';
    }

    // Combine relevant chunks into context
    const context = results
      .filter((r) => r.score > 0.5) // Only include relevant results
      .map((r) => `[Source: ${r.metadata.filename} (${r.metadata.year})]\n${r.text}`)
      .join('\n\n---\n\n');

    return context;
  } catch (error) {
    console.error('Error querying tax rules:', error);
    return '';
  }
}

/**
 * Delete a document and its vectors
 */
export async function deleteDocument(documentId: string): Promise<void> {
  // First, get the chunk count from Supabase
  const { data: doc, error: fetchError } = await supabase
    .from('tax_documents')
    .select('chunk_count')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error('Document not found');
  }

  // Delete from Pinecone using the chunk count
  if (isPineconeConfigured()) {
    await deleteVectorsByDocumentId(documentId, doc.chunk_count);
  }

  // Delete from Supabase
  const { error } = await supabase
    .from('tax_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error('Failed to delete document metadata');
  }
}

/**
 * List all indexed documents
 */
export async function listDocuments(): Promise<
  {
    id: string;
    filename: string;
    year: number;
    description: string | null;
    chunk_count: number;
    uploaded_at: string;
  }[]
> {
  const { data, error } = await supabase
    .from('tax_documents')
    .select('*')
    .order('year', { ascending: false });

  if (error) {
    throw new Error('Failed to list documents');
  }

  return data || [];
}

