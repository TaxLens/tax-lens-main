import Anthropic from "@anthropic-ai/sdk";
import pdfParse from "pdf-parse";
import { fromBuffer } from "pdf2pic";
import {
  MALAYSIA_TAX_RELIEF_CATEGORIES,
  TransactionData,
  TaxReliefCategory,
} from "./claude.service.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const taxCategoriesDescription = Object.entries(MALAYSIA_TAX_RELIEF_CATEGORIES)
  .map(
    ([key, val]) =>
      `- "${key}": ${val.name} (limit RM${val.limit.toLocaleString()}) - ${
        val.description
      }`
  )
  .join("\n");

const RECEIPT_ANALYSIS_PROMPT = `You are a Malaysian tax expert assistant. Analyze the provided receipt and extract transaction information for Malaysian tax relief filing.

IMPORTANT: Only identify REAL spending transactions. These include:
- Receipts for purchases
- Payment confirmations
- Invoice payments
- Bill payments
- Insurance premium payments
- Medical bills
- Education fees
- Childcare fees

Malaysian Tax Relief Categories for Year of Assessment 2024:
${taxCategoriesDescription}

IMPORTANT TAX RELIEF GUIDELINES:
- For travel expenses: Only assign "domestic_travel" if you can clearly confirm the destination is WITHIN Malaysia. If the destination is unclear, international, or not mentioned, use "non_deductible".
- For medical expenses: Only assign medical categories if the receipt clearly shows medical treatment, not general pharmacy purchases.
- For education: Verify it's from a recognized educational institution.

Please analyze this receipt and respond with a JSON object (no markdown, just the JSON):
{
  "isTransaction": boolean (true if this is a valid receipt with a clear amount),
  "merchant": string or null (the business/merchant name from the receipt),
  "amount": number or null (the total amount as a decimal number, e.g., 299.90),
  "currency": string (3-letter currency code, default to "MYR" for Malaysian receipts),
  "category": string or null (general category: "food", "transport", "shopping", "entertainment", "bills", "subscription", "travel", "health", "education", "insurance", "childcare", "sports", "electronics", "other"),
  "taxReliefCategory": string or null (one of the Malaysian tax relief category keys listed above, or "non_deductible" if not eligible),
  "transactionDate": string or null (in YYYY-MM-DD format, the date on the receipt),
  "confidenceScore": number (0.0 to 1.0, how confident you are in the extraction accuracy),
  "description": string or null (brief description of items purchased)
}

Only respond with the JSON object, nothing else.`;

/**
 * Extract JSON from potentially markdown-wrapped response
 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  // Check if wrapped in markdown code block
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  return trimmed;
}

/**
 * Build the prompt with optional filename context
 */
function buildPrompt(filename?: string): string {
  let prompt = RECEIPT_ANALYSIS_PROMPT;
  if (filename) {
    prompt += `\n\nAdditional context from filename: "${filename}"
Note: The filename may contain useful information like destinations (e.g., "KUL TPE" means Kuala Lumpur to Taipei), dates, or merchant names. Use this to help determine accurate categorization.`;
  }
  return prompt;
}

/**
 * Analyze a receipt image using Claude Vision API
 */
export async function analyzeReceiptImage(
  imageBase64: string,
  mimeType: ImageMediaType,
  filename?: string
): Promise<TransactionData> {
  console.log("\n" + "=".repeat(80));
  console.log("🧾 ANALYZING RECEIPT IMAGE");
  console.log("=".repeat(80));
  console.log(`MIME Type: ${mimeType}`);
  console.log(`Image size: ${Math.round(imageBase64.length / 1024)} KB`);
  if (filename) console.log(`Filename: ${filename}`);
  console.log("-".repeat(80));

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: buildPrompt(filename),
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const jsonText = extractJson(content.text);
    const data = JSON.parse(jsonText);

    const result: TransactionData = {
      isTransaction: Boolean(data.isTransaction),
      merchant: data.merchant || null,
      amount: data.amount ? Number(data.amount) : null,
      currency: data.currency || "MYR",
      category: data.category || null,
      taxReliefCategory: (data.taxReliefCategory as TaxReliefCategory) || null,
      transactionDate: data.transactionDate || null,
      confidenceScore: Math.min(
        1,
        Math.max(0, Number(data.confidenceScore) || 0)
      ),
      description: data.description || null,
    };

    logResult(result);
    return result;
  } catch (error) {
    console.error("❌ Error analyzing receipt image:", error);
    console.log("=".repeat(80) + "\n");
    return createEmptyResult();
  }
}

/**
 * Analyze receipt text using Claude
 */
export async function analyzeReceiptText(
  text: string,
  filename?: string
): Promise<TransactionData> {
  console.log("\n" + "=".repeat(80));
  console.log("📄 ANALYZING RECEIPT TEXT");
  console.log("=".repeat(80));
  console.log(`Text length: ${text.length} characters`);
  console.log(`Preview: ${text.substring(0, 200)}...`);
  if (filename) console.log(`Filename: ${filename}`);
  console.log("-".repeat(80));

  const prompt = `${buildPrompt(filename)}

Receipt content:
${text.substring(0, 6000)}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const jsonText = extractJson(content.text);
    const data = JSON.parse(jsonText);

    const result: TransactionData = {
      isTransaction: Boolean(data.isTransaction),
      merchant: data.merchant || null,
      amount: data.amount ? Number(data.amount) : null,
      currency: data.currency || "MYR",
      category: data.category || null,
      taxReliefCategory: (data.taxReliefCategory as TaxReliefCategory) || null,
      transactionDate: data.transactionDate || null,
      confidenceScore: Math.min(
        1,
        Math.max(0, Number(data.confidenceScore) || 0)
      ),
      description: data.description || null,
    };

    logResult(result);
    return result;
  } catch (error) {
    console.error("❌ Error analyzing receipt text:", error);
    console.log("=".repeat(80) + "\n");
    return createEmptyResult();
  }
}

/**
 * Analyze a PDF receipt - hybrid approach:
 * 1. Try text extraction first
 * 2. If no/minimal text (scanned PDF), convert to image and use Vision
 */
export async function analyzeReceiptPdf(
  pdfBuffer: Buffer,
  filename?: string
): Promise<TransactionData> {
  console.log("\n" + "=".repeat(80));
  console.log("📑 ANALYZING PDF RECEIPT");
  console.log("=".repeat(80));
  console.log(`PDF size: ${Math.round(pdfBuffer.length / 1024)} KB`);
  if (filename) console.log(`Filename: ${filename}`);

  try {
    // Step 1: Try text extraction using pdf-parse
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text?.trim() || "";

    console.log(`Extracted text length: ${extractedText.length} characters`);

    // Step 2: If sufficient text found, analyze it
    if (extractedText.length > 50) {
      console.log("✅ Sufficient text found, using text analysis");
      return analyzeReceiptText(extractedText, filename);
    }

    // Step 3: Scanned PDF - convert to image and use Vision
    console.log(
      "📷 Minimal text found, converting to image for Vision analysis"
    );

    const options = {
      density: 200,
      format: "png" as const,
      width: 1200,
      height: 1600,
    };

    const convert = fromBuffer(pdfBuffer, options);
    const pageResult = await convert(1, { responseType: "base64" });

    if (!pageResult.base64) {
      throw new Error("Failed to convert PDF to image");
    }

    return analyzeReceiptImage(pageResult.base64, "image/png", filename);
  } catch (error) {
    console.error("❌ Error analyzing PDF receipt:", error);
    console.log("=".repeat(80) + "\n");
    return createEmptyResult();
  }
}

/**
 * Helper to log the analysis result
 */
function logResult(result: TransactionData): void {
  console.log("🤖 CLAUDE OUTPUT:");
  console.log(
    `   Is Transaction: ${result.isTransaction ? "✅ YES" : "❌ NO"}`
  );
  if (result.isTransaction) {
    console.log(`   Merchant: ${result.merchant}`);
    console.log(`   Amount: ${result.currency} ${result.amount}`);
    console.log(`   Category: ${result.category}`);
    console.log(`   Tax Relief: ${result.taxReliefCategory}`);
    console.log(`   Date: ${result.transactionDate}`);
    console.log(`   Description: ${result.description}`);
    console.log(`   Confidence: ${(result.confidenceScore * 100).toFixed(0)}%`);
  }
  console.log("=".repeat(80) + "\n");
}

/**
 * Helper to create an empty result
 */
function createEmptyResult(): TransactionData {
  return {
    isTransaction: false,
    merchant: null,
    amount: null,
    currency: "MYR",
    category: null,
    taxReliefCategory: null,
    transactionDate: null,
    confidenceScore: 0,
    description: null,
  };
}
