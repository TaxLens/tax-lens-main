import { Router, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all transactions for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { category, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false, nullsFirst: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }

    if (startDate && typeof startDate === 'string') {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate && typeof endDate === 'string') {
      query = query.lte('transaction_date', endDate);
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
    const { merchant, amount, currency, category, transaction_date } = req.body;

    const updateData: Record<string, any> = {};
    if (merchant !== undefined) updateData.merchant = merchant;
    if (amount !== undefined) updateData.amount = amount;
    if (currency !== undefined) updateData.currency = currency;
    if (category !== undefined) updateData.category = category;
    if (transaction_date !== undefined) updateData.transaction_date = transaction_date;

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

// Get transaction summary/stats
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('transactions')
      .select('amount, currency, category, transaction_date')
      .eq('user_id', userId);

    if (startDate && typeof startDate === 'string') {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate && typeof endDate === 'string') {
      query = query.lte('transaction_date', endDate);
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

    // Group by month
    const byMonth: Record<string, number> = {};
    for (const t of transactions || []) {
      if (t.transaction_date) {
        const month = t.transaction_date.substring(0, 7); // YYYY-MM
        byMonth[month] = (byMonth[month] || 0) + (t.amount || 0);
      }
    }

    res.json({
      total,
      count,
      average: count > 0 ? total / count : 0,
      byCategory,
      byMonth,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;

