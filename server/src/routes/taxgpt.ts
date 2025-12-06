import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { queryTaxRules } from '../services/document.service.js';
import { isPineconeConfigured } from '../lib/pinecone.js';

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Chat endpoint
router.post('/chat', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message, history = [], year } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Query Pinecone for relevant tax rules
    let taxContext = '';
    if (isPineconeConfigured() && process.env.OPENAI_API_KEY) {
      try {
        taxContext = await queryTaxRules(message, year, 8);
        console.log(`📚 TaxGPT: Retrieved ${taxContext.length} chars of context`);
      } catch (error) {
        console.warn('Failed to query tax rules:', error);
      }
    }

    // Build the system prompt
    const systemPrompt = `You are TaxGPT, an expert Malaysian tax assistant. You help users understand Malaysian tax rules, relief categories, deductions, and filing requirements.

${taxContext ? `RELEVANT TAX RULES FROM OFFICIAL DOCUMENTS:
${taxContext}

Use the above official tax rules to answer questions accurately. If the information is from the documents, cite it.` : 'Note: No tax documents have been uploaded yet. Answers are based on general knowledge.'}

Guidelines:
- Be helpful, accurate, and concise
- Cite specific limits and conditions when applicable
- If you're not sure about something, say so
- Format monetary amounts in RM (Malaysian Ringgit)
- When relevant, mention the tax year the rules apply to
- Use bullet points for lists
- If the user asks about something not covered in the documents, let them know`;

    // Build messages array
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    
    // Add conversation history
    for (const msg of history.slice(-10)) { // Keep last 10 messages for context
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    res.json({
      response: content.text,
      hasContext: taxContext.length > 0,
    });
  } catch (error) {
    console.error('TaxGPT error:', error);
    res.status(500).json({ error: 'Failed to process your question' });
  }
});

export default router;

