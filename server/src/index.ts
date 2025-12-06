import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import gmailRoutes from './routes/gmail.js';
import transactionRoutes from './routes/transactions.js';
import receiptRoutes from './routes/receipts.js';
import filesRoutes from './routes/files.js';
import taxDocumentsRoutes from './routes/tax-documents.js';
import taxgptRoutes from './routes/taxgpt.js';

dotenv.config();

// Disable logs in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  // We keep console.error and console.warn for critical issues
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 image data

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/tax-documents', taxDocumentsRoutes);
app.use('/api/taxgpt', taxgptRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

