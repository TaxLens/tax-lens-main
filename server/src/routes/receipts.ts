import { Router, Response } from "express";
import multer from "multer";
import { supabase } from "../lib/supabase.js";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";
import {
  analyzeReceiptImage,
  analyzeReceiptPdf,
} from "../services/receipt.service.js";

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed."
        )
      );
    }
  },
});

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// Scan receipt endpoint
router.post(
  "/scan",
  authenticateToken,
  upload.single("receipt"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(
        `📤 Receipt uploaded: ${file.originalname} (${
          file.mimetype
        }, ${Math.round(file.size / 1024)} KB)`
      );

      let transactionData;
      const filename = file.originalname;

      if (file.mimetype === "application/pdf") {
        // Handle PDF
        transactionData = await analyzeReceiptPdf(file.buffer, filename);
      } else {
        // Handle image
        const base64 = file.buffer.toString("base64");
        const mimeType = file.mimetype as ImageMediaType;
        transactionData = await analyzeReceiptImage(base64, mimeType, filename);
      }

      if (!transactionData.isTransaction) {
        return res.status(400).json({
          error: "Could not extract transaction data from receipt",
          details:
            "The uploaded file does not appear to be a valid receipt with transaction information.",
        });
      }

      // Return the extracted data for user confirmation
      res.json({
        success: true,
        data: {
          merchant: transactionData.merchant,
          amount: transactionData.amount,
          currency: transactionData.currency,
          category: transactionData.category,
          taxReliefCategory: transactionData.taxReliefCategory,
          transactionDate: transactionData.transactionDate,
          description: transactionData.description,
          confidenceScore: transactionData.confidenceScore,
        },
      });
    } catch (error) {
      console.error("Error processing receipt:", error);
      res.status(500).json({ error: "Failed to process receipt" });
    }
  }
);

// Create transaction from receipt scan (after user confirmation)
router.post(
  "/create",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const {
        merchant,
        amount,
        currency = "MYR",
        category,
        taxReliefCategory,
        transactionDate,
        description,
      } = req.body;

      // Validate required fields
      if (!merchant || !amount) {
        return res
          .status(400)
          .json({ error: "Merchant and amount are required" });
      }

      // Generate a unique receipt ID
      const receiptId = `receipt_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;

      // Insert transaction
      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          email_id: receiptId, // Using email_id field for receipt reference
          merchant,
          amount: Number(amount),
          currency,
          category,
          tax_relief_category: taxReliefCategory,
          transaction_date: transactionDate,
          description,
          email_subject: "Receipt Scan",
          email_snippet: description || "Manually scanned receipt",
          confidence_score: 1.0, // User confirmed
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating transaction:", error);
        return res.status(500).json({ error: "Failed to create transaction" });
      }

      res.json({
        success: true,
        transaction,
      });
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  }
);

export default router;
