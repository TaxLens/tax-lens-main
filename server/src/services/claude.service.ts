import Anthropic from '@anthropic-ai/sdk';
import { EmailMessage } from './gmail.service.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Malaysian Tax Relief Categories for Year of Assessment 2024
export const MALAYSIA_TAX_RELIEF_CATEGORIES = {
  individual: {
    name: 'Individual & Dependent Relatives',
    limit: 9000,
    description: 'Automatic relief for individual taxpayer',
  },
  medical_parents: {
    name: 'Medical Expenses for Parents',
    limit: 8000,
    description: 'Medical treatment, special needs, carer expenses for parents',
  },
  medical_serious: {
    name: 'Medical Expenses (Serious Diseases)',
    limit: 10000,
    description: 'Medical expenses for self/spouse/child for serious diseases, fertility treatment, vaccination',
  },
  disabled_equipment: {
    name: 'Basic Supporting Equipment (Disabled)',
    limit: 6000,
    description: 'Supporting equipment for disabled self/spouse/child/parent',
  },
  education_self: {
    name: 'Education Fees (Self)',
    limit: 7000,
    description: 'Course fees for skills/qualifications at recognized institutions',
  },
  lifestyle: {
    name: 'Lifestyle',
    limit: 2500,
    description: 'Books, computers, smartphones, tablets, sports equipment, gym membership, internet subscription',
  },
  lifestyle_sports: {
    name: 'Lifestyle - Sports (Additional)',
    limit: 1000,
    description: 'Additional relief for sports equipment and activities',
  },
  breastfeeding: {
    name: 'Breastfeeding Equipment',
    limit: 1000,
    description: 'Breastfeeding equipment for own use (women only, child under 2)',
  },
  childcare: {
    name: 'Childcare Fees',
    limit: 3000,
    description: 'Fees to registered childcare center/kindergarten for child 6 years and below',
  },
  sspn: {
    name: 'SSPN (Education Savings)',
    limit: 8000,
    description: 'Net deposit in Skim Simpanan Pendidikan Nasional',
  },
  life_insurance_epf: {
    name: 'Life Insurance & EPF',
    limit: 7000,
    description: 'Life insurance premiums and EPF contributions',
  },
  private_retirement: {
    name: 'Private Retirement Scheme',
    limit: 3000,
    description: 'Contributions to PRS or deferred annuity scheme',
  },
  education_medical_insurance: {
    name: 'Education & Medical Insurance',
    limit: 3000,
    description: 'Insurance premiums for education or medical benefits',
  },
  socso: {
    name: 'SOCSO Contribution',
    limit: 350,
    description: 'Social security contributions (PERKESO)',
  },
  domestic_travel: {
    name: 'Domestic Tourism',
    limit: 1000,
    description: 'Expenses on domestic travel, accommodation at registered premises',
  },
  ev_charging: {
    name: 'EV Charging Facilities',
    limit: 2500,
    description: 'Purchase, installation, rental, hire purchase of EV charging facilities',
  },
  spouse: {
    name: 'Spouse Relief',
    limit: 4000,
    description: 'Relief for spouse with no income or joint assessment',
  },
  child: {
    name: 'Child Relief',
    limit: 8000,
    description: 'RM2,000 per child under 18, RM8,000 for child in higher education',
  },
  disabled_spouse: {
    name: 'Disabled Spouse',
    limit: 5000,
    description: 'Additional relief for disabled spouse',
  },
  disabled_child: {
    name: 'Disabled Child',
    limit: 6000,
    description: 'Additional relief for disabled child',
  },
  non_deductible: {
    name: 'Non-Deductible',
    limit: 0,
    description: 'Not eligible for tax relief',
  },
} as const;

export type TaxReliefCategory = keyof typeof MALAYSIA_TAX_RELIEF_CATEGORIES;

export interface TransactionData {
  isTransaction: boolean;
  merchant: string | null;
  amount: number | null;
  currency: string;
  category: string | null;
  taxReliefCategory: TaxReliefCategory | null;
  transactionDate: string | null;
  confidenceScore: number;
  description: string | null;
}

export async function analyzeEmailForTransaction(
  email: EmailMessage
): Promise<TransactionData> {
  console.log('\n' + '='.repeat(80));
  console.log('📧 ANALYZING EMAIL');
  console.log('='.repeat(80));
  console.log(`Subject: ${email.subject}`);
  console.log(`From: ${email.from}`);
  console.log(`Date: ${email.date}`);
  console.log(`Snippet: ${email.snippet.substring(0, 200)}...`);
  console.log('-'.repeat(80));

  const taxCategoriesDescription = Object.entries(MALAYSIA_TAX_RELIEF_CATEGORIES)
    .map(([key, val]) => `- "${key}": ${val.name} (limit RM${val.limit.toLocaleString()}) - ${val.description}`)
    .join('\n');

  const prompt = `You are a Malaysian tax expert assistant. Analyze the following email and determine if it represents a legitimate spending transaction that could be used for Malaysian tax relief filing.

Email Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}
Content:
${email.snippet}

${email.body.substring(0, 4000)}

IMPORTANT: Only identify REAL spending transactions. These include:
- Receipts for purchases
- Payment confirmations
- Invoice payments
- Subscription charges
- Bill payments
- Insurance premium payments
- Medical bills
- Education fees
- Childcare fees
- Bank transfers (money sent to someone)

DO NOT identify these as transactions:
- Marketing/promotional emails
- Order shipping notifications (without payment info)
- Account statements (without specific transactions)
- Password reset emails
- General newsletters
- Money RECEIVED (only track money SPENT)

For BANK TRANSFERS: Use the RECIPIENT'S NAME as the merchant (e.g., if sending to "John Doe", merchant should be "John Doe")

Malaysian Tax Relief Categories for Year of Assessment 2024:
${taxCategoriesDescription}

Please analyze this email and respond with a JSON object (no markdown, just the JSON):
{
  "isTransaction": boolean (true ONLY if this is a real spending/payment transaction with a clear amount),
  "merchant": string or null (the company/merchant name, OR for bank transfers use the RECIPIENT'S FULL NAME),
  "amount": number or null (the transaction amount as a decimal number in MYR, e.g., 299.90),
  "currency": string (3-letter currency code, default to "MYR" for Malaysian transactions),
  "category": string or null (general category: "food", "transport", "shopping", "entertainment", "bills", "subscription", "travel", "health", "education", "insurance", "childcare", "sports", "electronics", "other"),
  "taxReliefCategory": string or null (one of the Malaysian tax relief category keys listed above, or "non_deductible" if not eligible for any relief),
  "transactionDate": string or null (in YYYY-MM-DD format, the date of the transaction),
  "confidenceScore": number (0.0 to 1.0, how confident you are this is a valid transaction),
  "description": string or null (brief description of what was purchased)
}

Only respond with the JSON object, nothing else.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
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

    const result = {
      isTransaction: Boolean(data.isTransaction),
      merchant: data.merchant || null,
      amount: data.amount ? Number(data.amount) : null,
      currency: data.currency || 'MYR',
      category: data.category || null,
      taxReliefCategory: data.taxReliefCategory || null,
      transactionDate: data.transactionDate || null,
      confidenceScore: Math.min(1, Math.max(0, Number(data.confidenceScore) || 0)),
      description: data.description || null,
    };

    console.log('🤖 CLAUDE OUTPUT:');
    console.log(`   Is Transaction: ${result.isTransaction ? '✅ YES' : '❌ NO'}`);
    if (result.isTransaction) {
      console.log(`   Merchant: ${result.merchant}`);
      console.log(`   Amount: ${result.currency} ${result.amount}`);
      console.log(`   Category: ${result.category}`);
      console.log(`   Tax Relief: ${result.taxReliefCategory}`);
      console.log(`   Date: ${result.transactionDate}`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Confidence: ${(result.confidenceScore * 100).toFixed(0)}%`);
    }
    console.log('='.repeat(80) + '\n');

    return result;
  } catch (error) {
    console.error('❌ Error analyzing email:', error);
    console.log('='.repeat(80) + '\n');
    return {
      isTransaction: false,
      merchant: null,
      amount: null,
      currency: 'MYR',
      category: null,
      taxReliefCategory: null,
      transactionDate: null,
      confidenceScore: 0,
      description: null,
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

// Export tax categories for use in routes
export function getTaxReliefCategories() {
  return MALAYSIA_TAX_RELIEF_CATEGORIES;
}
