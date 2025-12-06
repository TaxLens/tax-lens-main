import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { fetchEmails, refreshAccessToken } from '../services/gmail.service.js';
import { analyzeMultipleEmails } from '../services/claude.service.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { triggerAlertCheck } from '../services/alert.service.js';

const router = Router();

// Sync emails and analyze for transactions
router.post('/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user's access token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let accessToken = user.google_access_token;

    if (!accessToken) {
      // Try to refresh the token
      accessToken = await refreshAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ error: 'Gmail not connected. Please re-authenticate.' });
      }
    }

    // Fetch primary emails for the specified year (or current year)
    const maxResults = req.body.maxResults || 200; // Increased default
    const year = req.body.year ? parseInt(req.body.year, 10) : undefined;
    let emails;
    
    try {
      emails = await fetchEmails(accessToken, maxResults, year);
    } catch (gmailError: any) {
      // Token might be expired, try refreshing
      if (gmailError.code === 401 || gmailError.message?.includes('invalid_grant')) {
        accessToken = await refreshAccessToken(userId);
        if (!accessToken) {
          return res.status(401).json({ error: 'Gmail token expired. Please re-authenticate.' });
        }
        emails = await fetchEmails(accessToken, maxResults, year);
      } else {
        throw gmailError;
      }
    }

    if (emails.length === 0) {
      return res.json({ 
        message: `No emails found for ${year || 'current year'}`,
        processed: 0,
        transactions: 0,
        year: year || new Date().getFullYear()
      });
    }

    // Get existing email IDs to avoid duplicates
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('email_id')
      .eq('user_id', userId);

    const existingEmailIds = new Set(existingTransactions?.map(t => t.email_id) || []);
    const newEmails = emails.filter(e => !existingEmailIds.has(e.id));

    if (newEmails.length === 0) {
      return res.json({ 
        message: 'All emails already processed',
        processed: 0,
        transactions: 0 
      });
    }

    console.log(`Analyzing ${newEmails.length} new emails with Claude...`);

    // Analyze emails with Claude
    const analysisResults = await analyzeMultipleEmails(newEmails);

    // Save transactions to database
    const transactionsToInsert = [];
    
    for (const email of newEmails) {
      const analysis = analysisResults.get(email.id);
      
      // Only save if it's a real transaction with good confidence
      if (analysis?.isTransaction && analysis.confidenceScore >= 0.6) {
        transactionsToInsert.push({
          user_id: userId,
          email_id: email.id,
          merchant: analysis.merchant,
          amount: analysis.amount,
          currency: analysis.currency,
          category: analysis.category,
          tax_relief_category: analysis.taxReliefCategory,
          transaction_date: analysis.transactionDate,
          email_subject: email.subject,
          email_snippet: email.snippet,
          email_date: email.date,
          description: analysis.description,
          confidence_score: analysis.confidenceScore,
        });
      }
    }

    if (transactionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
      } else {
        // Trigger alert check for category utilization (async, non-blocking)
        // Only if we inserted tax-deductible transactions
        const hasTaxDeductible = transactionsToInsert.some(
          t => t.tax_relief_category && t.tax_relief_category !== 'non_deductible'
        );
        if (hasTaxDeductible) {
          triggerAlertCheck(userId);
        }
      }
    }

    // Update last sync time
    await supabase
      .from('users')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', userId);

    res.json({
      message: 'Sync completed',
      processed: newEmails.length,
      transactions: transactionsToInsert.length,
      totalEmails: emails.length,
      year: year || new Date().getFullYear(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync emails' });
  }
});

// Get sync status
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('last_sync_at, google_access_token')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      lastSyncAt: user.last_sync_at,
      gmailConnected: !!user.google_access_token,
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

export default router;
