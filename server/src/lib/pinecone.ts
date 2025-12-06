import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndex = process.env.PINECONE_INDEX || 'taxlens-tax-rules';

if (!pineconeApiKey) {
  console.warn('Warning: PINECONE_API_KEY not set. Tax rules RAG will be disabled.');
}

// Initialize Pinecone client
let pinecone: Pinecone | null = null;

export function getPineconeClient(): Pinecone | null {
  if (!pineconeApiKey) return null;
  
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: pineconeApiKey,
    });
  }
  return pinecone;
}

export function getPineconeIndex() {
  const client = getPineconeClient();
  if (!client) return null;
  return client.index(pineconeIndex);
}

// Vector dimension for OpenAI text-embedding-3-large (truncated to 1024)
export const EMBEDDING_DIMENSION = 1024;

export interface TaxRuleChunk {
  id: string;
  text: string;
  metadata: {
    documentId: string;
    filename: string;
    year: number;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface QueryResult {
  id: string;
  score: number;
  text: string;
  metadata: TaxRuleChunk['metadata'];
}

// Upsert vectors to Pinecone
export async function upsertVectors(
  vectors: { id: string; values: number[]; metadata: TaxRuleChunk['metadata'] & { text: string } }[]
): Promise<void> {
  const index = getPineconeIndex();
  if (!index) {
    throw new Error('Pinecone not configured');
  }

  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

// Query vectors from Pinecone
export async function queryVectors(
  queryVector: number[],
  topK: number = 5,
  filter?: { year?: number }
): Promise<QueryResult[]> {
  const index = getPineconeIndex();
  if (!index) {
    return [];
  }

  const queryFilter = filter?.year ? { year: { $eq: filter.year } } : undefined;

  const results = await index.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
    filter: queryFilter,
  });

  return (results.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    text: (match.metadata?.text as string) || '',
    metadata: {
      documentId: (match.metadata?.documentId as string) || '',
      filename: (match.metadata?.filename as string) || '',
      year: (match.metadata?.year as number) || 0,
      chunkIndex: (match.metadata?.chunkIndex as number) || 0,
      totalChunks: (match.metadata?.totalChunks as number) || 0,
    },
  }));
}

// Delete vectors by document ID
// Since Pinecone serverless doesn't support deleteMany with metadata filters,
// we delete by vector IDs which follow the pattern: {documentId}_chunk_{index}
export async function deleteVectorsByDocumentId(documentId: string, chunkCount: number): Promise<void> {
  const index = getPineconeIndex();
  if (!index) {
    throw new Error('Pinecone not configured');
  }

  // Generate all vector IDs for this document
  const vectorIds = Array.from({ length: chunkCount }, (_, i) => `${documentId}_chunk_${i}`);

  // Delete in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectorIds.length; i += batchSize) {
    const batch = vectorIds.slice(i, i + batchSize);
    await index.deleteMany(batch);
  }
}

// Check if Pinecone is configured
export function isPineconeConfigured(): boolean {
  return !!pineconeApiKey;
}

