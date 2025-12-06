import Anthropic from '@anthropic-ai/sdk';
import { EmailMessage } from './gmail.service.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TransactionData {
  isTransaction: boolean;
  merchant: string | null;
  amount: number | null;
  currency: string;
  category: string | null;
  transactionDate: string | null;
  confidenceScore: number;
}

export async function analyzeEmailForTransaction(
  email: EmailMessage
): Promise<TransactionData> {
  const prompt = `Analyze the following email and determine if it represents a spending transaction (purchase, payment, subscription, etc.).

Email Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}
Content:
${email.snippet}

${email.body.substring(0, 3000)}

Please analyze this email and respond with a JSON object (no markdown, just the JSON):
{
  "isTransaction": boolean (true if this is a spending/payment transaction email),
  "merchant": string or null (the company/merchant name),
  "amount": number or null (the transaction amount as a decimal number, e.g., 29.99),
  "currency": string (3-letter currency code, default to "USD" if unclear),
  "category": string or null (one of: "food", "transport", "shopping", "entertainment", "bills", "subscription", "travel", "health", "education", "other"),
  "transactionDate": string or null (in YYYY-MM-DD format, the date of the transaction),
  "confidenceScore": number (0.0 to 1.0, how confident you are this is a valid transaction)
}

Only respond with the JSON object, nothing else.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON response
    const jsonText = content.text.trim();
    const data = JSON.parse(jsonText);

    return {
      isTransaction: Boolean(data.isTransaction),
      merchant: data.merchant || null,
      amount: data.amount ? Number(data.amount) : null,
      currency: data.currency || 'USD',
      category: data.category || null,
      transactionDate: data.transactionDate || null,
      confidenceScore: Math.min(1, Math.max(0, Number(data.confidenceScore) || 0)),
    };
  } catch (error) {
    console.error('Error analyzing email:', error);
    return {
      isTransaction: false,
      merchant: null,
      amount: null,
      currency: 'USD',
      category: null,
      transactionDate: null,
      confidenceScore: 0,
    };
  }
}

export async function analyzeMultipleEmails(
  emails: EmailMessage[]
): Promise<Map<string, TransactionData>> {
  const results = new Map<string, TransactionData>();

  // Process emails in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const promises = batch.map(async (email) => {
      const data = await analyzeEmailForTransaction(email);
      return { emailId: email.id, data };
    });

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      results.set(result.emailId, result.data);
    }

    // Small delay between batches
    if (i + batchSize < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

