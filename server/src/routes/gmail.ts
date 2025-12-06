import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { fetchEmails, refreshAccessToken } from '../services/gmail.service.js';
import { analyzeMultipleEmails } from '../services/claude.service.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { triggerAlertCheck } from '../services/alert.service.js';

const router = Router();

// Performance logging helper
function logPerformance(label: string, startTime: number, count?: number) {
  const duration = Date.now() - startTime;
  const durationSec = duration / 1000;
  let message = `⏱️  ${label}: ${duration}ms (${durationSec.toFixed(2)}s)`;
  if (count !== undefined && count > 0) {
    const perSecond = count / durationSec;
    message += ` | ${count} items | ${perSecond.toFixed(2)} items/sec`;
  }
  console.log(message);
  return { duration, durationSec };
}

// Sync emails and analyze for transactions
router.post('/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  const syncStartTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('📧 EMAIL SYNC STARTED');
  console.log('='.repeat(60));
  
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
    const maxResults = req.body.maxResults || 200;
    const year = req.body.year ? parseInt(req.body.year, 10) : undefined;
    let emails;
    
    const fetchStartTime = Date.now();
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
    const fetchMetrics = logPerformance('Gmail Fetch', fetchStartTime, emails.length);

    if (emails.length === 0) {
      console.log('📭 No emails found');
      console.log('='.repeat(60) + '\n');
      return res.json({ 
        message: `No emails found for ${year || 'current year'}`,
        processed: 0,
        transactions: 0,
        year: year || new Date().getFullYear()
      });
    }

    // Get existing email IDs to avoid duplicates
    const dedupeStartTime = Date.now();
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('email_id')
      .eq('user_id', userId);

    const existingEmailIds = new Set(existingTransactions?.map(t => t.email_id) || []);
    const newEmails = emails.filter(e => !existingEmailIds.has(e.id));
    logPerformance('Deduplication Check', dedupeStartTime);
    console.log(`   📊 Total: ${emails.length} | Already processed: ${existingEmailIds.size} | New: ${newEmails.length}`);

    if (newEmails.length === 0) {
      const totalMetrics = logPerformance('TOTAL SYNC TIME', syncStartTime);
      console.log('✅ All emails already processed');
      console.log('='.repeat(60) + '\n');
      return res.json({ 
        message: 'All emails already processed',
        processed: 0,
        transactions: 0,
        metrics: {
          totalDurationMs: totalMetrics.duration,
          emailsFetched: emails.length,
          emailsAnalyzed: 0,
        }
      });
    }

    // Analyze emails with Claude
    console.log(`\n🤖 Analyzing ${newEmails.length} new emails with Claude...`);
    const analysisStartTime = Date.now();
    const { results: analysisResults, confidenceStats } = await analyzeMultipleEmails(newEmails);
    const analysisMetrics = logPerformance('Claude Analysis', analysisStartTime, newEmails.length);

    // Log confidence statistics
    console.log(`\n📊 CONFIDENCE STATISTICS:`);
    console.log(`   Average: ${(confidenceStats.average * 100).toFixed(1)}%`);
    console.log(`   Median:  ${(confidenceStats.median * 100).toFixed(1)}%`);
    console.log(`   Range:   ${(confidenceStats.min * 100).toFixed(0)}% - ${(confidenceStats.max * 100).toFixed(0)}%`);
    console.log(`   Distribution: 🟢 High (≥80%): ${confidenceStats.highConfidence} | 🟡 Medium (60-80%): ${confidenceStats.mediumConfidence} | 🔴 Low (<60%): ${confidenceStats.lowConfidence}`);

    // Save transactions to database
    const dbStartTime = Date.now();
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
        const hasTaxDeductible = transactionsToInsert.some(
          t => t.tax_relief_category && t.tax_relief_category !== 'non_deductible'
        );
        if (hasTaxDeductible) {
          triggerAlertCheck(userId);
        }
      }
    }
    logPerformance('Database Insert', dbStartTime, transactionsToInsert.length);

    // Update last sync time
    await supabase
      .from('users')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', userId);

    // Final performance summary
    const totalMetrics = logPerformance('TOTAL SYNC TIME', syncStartTime, newEmails.length);
    
    // Calculate total inbox scan rate (all emails / total time)
    const totalInboxScanRate = emails.length / totalMetrics.durationSec;
    
    console.log('\n📈 SYNC SUMMARY:');
    console.log(`   Emails fetched: ${emails.length}`);
    console.log(`   Emails analyzed: ${newEmails.length}`);
    console.log(`   Transactions found: ${transactionsToInsert.length}`);
    console.log(`   Conversion rate: ${((transactionsToInsert.length / newEmails.length) * 100).toFixed(1)}%`);
    console.log(`   Analysis speed: ${(newEmails.length / analysisMetrics.durationSec).toFixed(2)} emails/sec`);
    console.log(`   Total inbox scan rate: ${totalInboxScanRate.toFixed(2)} emails/sec (${emails.length} emails in ${totalMetrics.durationSec.toFixed(1)}s)`);
    console.log(`   Model confidence: ${(confidenceStats.average * 100).toFixed(1)}% avg`);
    console.log('='.repeat(60) + '\n');

    res.json({
      message: 'Sync completed',
      processed: newEmails.length,
      transactions: transactionsToInsert.length,
      totalEmails: emails.length,
      year: year || new Date().getFullYear(),
      metrics: {
        totalDurationMs: totalMetrics.duration,
        totalDurationSec: parseFloat(totalMetrics.durationSec.toFixed(2)),
        fetchDurationMs: fetchMetrics.duration,
        analysisDurationMs: analysisMetrics.duration,
        analysisEmailsPerSecond: parseFloat((newEmails.length / analysisMetrics.durationSec).toFixed(2)),
        totalInboxScanRate: parseFloat(totalInboxScanRate.toFixed(2)),
        conversionRate: parseFloat(((transactionsToInsert.length / newEmails.length) * 100).toFixed(1)),
        confidence: {
          average: parseFloat((confidenceStats.average * 100).toFixed(1)),
          median: parseFloat((confidenceStats.median * 100).toFixed(1)),
          min: parseFloat((confidenceStats.min * 100).toFixed(0)),
          max: parseFloat((confidenceStats.max * 100).toFixed(0)),
          distribution: {
            high: confidenceStats.highConfidence,
            medium: confidenceStats.mediumConfidence,
            low: confidenceStats.lowConfidence,
          }
        }
      }
    });
  } catch (error) {
    console.error('Sync error:', error);
    console.log('='.repeat(60) + '\n');
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
