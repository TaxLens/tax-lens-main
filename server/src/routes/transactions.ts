import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { getTaxReliefCategories, MALAYSIA_TAX_RELIEF_CATEGORIES } from '../services/claude.service.js';
import { triggerAlertCheck } from '../services/alert.service.js';

const router = Router();

// Get Malaysian tax relief categories
router.get('/tax-categories', authenticateToken, async (req: AuthRequest, res: Response) => {
  res.json({ categories: getTaxReliefCategories() });
});

// Get all transactions for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { category, taxReliefCategory, startDate, endDate, year, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false, nullsFirst: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }

    if (taxReliefCategory && typeof taxReliefCategory === 'string') {
      query = query.eq('tax_relief_category', taxReliefCategory);
    }

    // If year is specified, filter by that tax year (Jan 1 - Dec 31)
    if (year && typeof year === 'string') {
      const yearNum = parseInt(year, 10);
      query = query.gte('transaction_date', `${yearNum}-01-01`)
                   .lte('transaction_date', `${yearNum}-12-31`);
    } else {
      // Otherwise use startDate/endDate if provided
      if (startDate && typeof startDate === 'string') {
        query = query.gte('transaction_date', startDate);
      }

      if (endDate && typeof endDate === 'string') {
        query = query.lte('transaction_date', endDate);
      }
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.json({
      transactions: transactions || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Update transaction (for manual corrections)
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { merchant, amount, currency, category, tax_relief_category, transaction_date, description } = req.body;

    const updateData: Record<string, any> = {};
    if (merchant !== undefined) updateData.merchant = merchant;
    if (amount !== undefined) updateData.amount = amount;
    if (currency !== undefined) updateData.currency = currency;
    if (category !== undefined) updateData.category = category;
    if (tax_relief_category !== undefined) updateData.tax_relief_category = tax_relief_category;
    if (transaction_date !== undefined) updateData.transaction_date = transaction_date;
    if (description !== undefined) updateData.description = description;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return res.status(500).json({ error: 'Failed to update transaction' });
    }

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Trigger alert check if tax relief category was updated to a deductible category
    const newTaxCategory = transaction.tax_relief_category;
    if (newTaxCategory && newTaxCategory !== 'non_deductible') {
      triggerAlertCheck(userId);
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting transaction:', error);
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Get transaction summary/stats including tax relief breakdown
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate, year } = req.query;

    let query = supabase
      .from('transactions')
      .select('amount, currency, category, tax_relief_category, transaction_date')
      .eq('user_id', userId);

    // If year is specified, filter by that tax year (Jan 1 - Dec 31)
    if (year && typeof year === 'string') {
      const yearNum = parseInt(year, 10);
      query = query.gte('transaction_date', `${yearNum}-01-01`)
                   .lte('transaction_date', `${yearNum}-12-31`);
    } else {
      // Otherwise use startDate/endDate if provided
      if (startDate && typeof startDate === 'string') {
        query = query.gte('transaction_date', startDate);
      }

      if (endDate && typeof endDate === 'string') {
        query = query.lte('transaction_date', endDate);
      }
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    // Calculate summary stats
    const total = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const count = transactions?.length || 0;

    // Group by category
    const byCategory: Record<string, number> = {};
    for (const t of transactions || []) {
      const cat = t.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
    }

    // Group by tax relief category with limits
    const byTaxRelief: Record<string, { amount: number; limit: number; name: string; remaining: number }> = {};
    for (const t of transactions || []) {
      const taxCat = t.tax_relief_category || 'non_deductible';
      const categoryInfo = MALAYSIA_TAX_RELIEF_CATEGORIES[taxCat as keyof typeof MALAYSIA_TAX_RELIEF_CATEGORIES];
      
      if (!byTaxRelief[taxCat]) {
        byTaxRelief[taxCat] = {
          amount: 0,
          limit: categoryInfo?.limit || 0,
          name: categoryInfo?.name || taxCat,
          remaining: categoryInfo?.limit || 0,
        };
      }
      byTaxRelief[taxCat].amount += t.amount || 0;
      byTaxRelief[taxCat].remaining = Math.max(0, byTaxRelief[taxCat].limit - byTaxRelief[taxCat].amount);
    }

    // Group by month
    const byMonth: Record<string, number> = {};
    for (const t of transactions || []) {
      if (t.transaction_date) {
        const month = t.transaction_date.substring(0, 7); // YYYY-MM
        byMonth[month] = (byMonth[month] || 0) + (t.amount || 0);
      }
    }

    // Calculate total eligible tax relief (capped at limits)
    let totalTaxRelief = 0;
    for (const [, data] of Object.entries(byTaxRelief)) {
      if (data.limit > 0) {
        totalTaxRelief += Math.min(data.amount, data.limit);
      }
    }

    // Calculate the selected year and filing deadline
    const selectedYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const filingDeadline = `30 April ${selectedYear + 1}`;

    res.json({
      total,
      count,
      average: count > 0 ? total / count : 0,
      byCategory,
      byTaxRelief,
      byMonth,
      totalTaxRelief,
      taxCategories: MALAYSIA_TAX_RELIEF_CATEGORIES,
      year: selectedYear,
      filingDeadline,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
