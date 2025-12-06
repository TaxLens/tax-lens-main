import { Router, Response } from 'express';
import multer from 'multer';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import {
  indexDocument,
  deleteDocument,
  listDocuments,
  queryTaxRules,
} from '../services/document.service.js';
import { isPineconeConfigured } from '../lib/pinecone.js';

const router = Router();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Get RAG configuration status
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  res.json({
    pineconeConfigured: isPineconeConfigured(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
  });
});

// Upload and index a PDF document
router.post(
  '/upload',
  authenticateToken,
  upload.single('document'),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      const { year, description } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!year) {
        return res.status(400).json({ error: 'Year is required' });
      }

      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({ error: 'Invalid year' });
      }

      if (!isPineconeConfigured()) {
        return res.status(503).json({
          error: 'RAG system not configured. Please set PINECONE_API_KEY.',
        });
      }

      console.log(`📤 Tax document uploaded: ${file.originalname} for year ${yearNum}`);

      const result = await indexDocument(
        file.buffer,
        file.originalname,
        yearNum,
        description
      );

      res.json({
        success: true,
        documentId: result.documentId,
        chunkCount: result.chunkCount,
        message: `Document indexed successfully with ${result.chunkCount} chunks`,
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to process document',
      });
    }
  }
);

// List all indexed documents
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const documents = await listDocuments();
    res.json({ documents });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Delete a document
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await deleteDocument(id);

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Test query interface
router.post('/query', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { query, year, topK } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const context = await queryTaxRules(query, year, topK || 5);

    res.json({
      query,
      year: year || 'all years',
      context: context || 'No relevant tax rules found',
      hasResults: context.length > 0,
    });
  } catch (error) {
    console.error('Error querying tax rules:', error);
    res.status(500).json({ error: 'Failed to query tax rules' });
  }
});

export default router;

