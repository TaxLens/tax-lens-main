import { Router, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";
import archiver from "archiver";

const router = Router();

interface ReceiptFile {
  id: string;
  transactionId: string;
  merchant: string | null;
  amount: number | null;
  transactionDate: string | null;
  receiptUrl: string;
  fileName: string;
  year: number;
}

// Get all receipts grouped by year
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get all transactions with receipt URLs
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("id, merchant, amount, transaction_date, receipt_url, created_at")
      .eq("user_id", userId)
      .not("receipt_url", "is", null)
      .order("transaction_date", { ascending: false });

    if (error) {
      console.error("Error fetching receipts:", error);
      return res.status(500).json({ error: "Failed to fetch receipts" });
    }

    // Group by year
    const receiptsByYear: Record<number, ReceiptFile[]> = {};

    for (const tx of transactions || []) {
      const date = tx.transaction_date
        ? new Date(tx.transaction_date)
        : new Date(tx.created_at);
      const year = date.getFullYear();

      // Extract filename from URL
      const urlParts = tx.receipt_url?.split("/") || [];
      const fileName = urlParts[urlParts.length - 1] || "receipt";

      if (!receiptsByYear[year]) {
        receiptsByYear[year] = [];
      }

      receiptsByYear[year].push({
        id: `${tx.id}`,
        transactionId: tx.id,
        merchant: tx.merchant,
        amount: tx.amount,
        transactionDate: tx.transaction_date,
        receiptUrl: tx.receipt_url,
        fileName,
        year,
      });
    }

    // Sort years in descending order
    const sortedYears = Object.keys(receiptsByYear)
      .map(Number)
      .sort((a, b) => b - a);

    const result = sortedYears.map((year) => ({
      year,
      receipts: receiptsByYear[year],
      count: receiptsByYear[year].length,
    }));

    res.json({
      years: result,
      totalCount: transactions?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
});

// Get receipts for a specific year
router.get(
  "/:year",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const year = parseInt(req.params.year, 10);

      if (isNaN(year)) {
        return res.status(400).json({ error: "Invalid year" });
      }

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      // Get transactions with receipt URLs for the specified year
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(
          "id, merchant, amount, transaction_date, receipt_url, created_at"
        )
        .eq("user_id", userId)
        .not("receipt_url", "is", null)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false });

      if (error) {
        console.error("Error fetching receipts:", error);
        return res.status(500).json({ error: "Failed to fetch receipts" });
      }

      const receipts: ReceiptFile[] =
        transactions?.map((tx) => {
          const urlParts = tx.receipt_url?.split("/") || [];
          const fileName = urlParts[urlParts.length - 1] || "receipt";

          return {
            id: `${tx.id}`,
            transactionId: tx.id,
            merchant: tx.merchant,
            amount: tx.amount,
            transactionDate: tx.transaction_date,
            receiptUrl: tx.receipt_url,
            fileName,
            year,
          };
        }) || [];

      res.json({
        year,
        receipts,
        count: receipts.length,
      });
    } catch (error) {
      console.error("Error fetching receipts:", error);
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  }
);

// Bulk download receipts for a year as ZIP
router.get(
  "/download/:year",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const year = parseInt(req.params.year, 10);

      if (isNaN(year)) {
        return res.status(400).json({ error: "Invalid year" });
      }

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      // Get transactions with receipt URLs for the specified year
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("id, merchant, amount, transaction_date, receipt_url")
        .eq("user_id", userId)
        .not("receipt_url", "is", null)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false });

      if (error) {
        console.error("Error fetching receipts:", error);
        return res.status(500).json({ error: "Failed to fetch receipts" });
      }

      if (!transactions || transactions.length === 0) {
        return res.status(404).json({ error: "No receipts found for this year" });
      }

      // Set up ZIP response
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=receipts_${year}.zip`
      );

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      // Fetch each receipt and add to ZIP
      for (const tx of transactions) {
        if (!tx.receipt_url) continue;

        try {
          // Fetch the image from the URL
          const response = await fetch(tx.receipt_url);
          if (!response.ok) continue;

          const buffer = await response.arrayBuffer();

          // Generate filename
          const date = tx.transaction_date || "unknown";
          const merchant = (tx.merchant || "receipt")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .substring(0, 30);
          const extension = tx.receipt_url.split(".").pop() || "jpg";
          const fileName = `${date}_${merchant}_${tx.id.substring(0, 8)}.${extension}`;

          archive.append(Buffer.from(buffer), { name: fileName });
        } catch (err) {
          console.error(`Failed to fetch receipt ${tx.id}:`, err);
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error("Error creating ZIP:", error);
      res.status(500).json({ error: "Failed to create ZIP archive" });
    }
  }
);

export default router;

