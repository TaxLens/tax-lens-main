import { supabase } from '../lib/supabase.js';
import { 
  sendCategoryAlertEmail, 
  wasAlertSent, 
  recordAlertSent 
} from './email.service.js';

// Tax relief categories with their limits (matching frontend)
const TAX_RELIEF_CATEGORIES: Record<string, { label: string; limit: number }> = {
  'medical_parents': { label: 'Medical (Parents)', limit: 8000 },
  'medical_serious': { label: 'Medical (Serious Diseases)', limit: 10000 },
  'disabled_equipment': { label: 'Disabled Equipment', limit: 6000 },
  'education_self': { label: 'Education (Self)', limit: 7000 },
  'lifestyle': { label: 'Lifestyle', limit: 2500 },
  'lifestyle_sports': { label: 'Lifestyle - Sports', limit: 1000 },
  'breastfeeding': { label: 'Breastfeeding Equipment', limit: 1000 },
  'childcare': { label: 'Childcare Fees', limit: 3000 },
  'sspn': { label: 'SSPN (Education Savings)', limit: 8000 },
  'life_insurance_epf': { label: 'Life Insurance & EPF', limit: 7000 },
  'private_retirement': { label: 'Private Retirement Scheme', limit: 3000 },
  'education_medical_insurance': { label: 'Education & Medical Insurance', limit: 3000 },
  'socso': { label: 'SOCSO Contribution', limit: 350 },
  'domestic_travel': { label: 'Domestic Tourism', limit: 1000 },
  'ev_charging': { label: 'EV Charging Facilities', limit: 2500 },
  'spouse': { label: 'Spouse Relief', limit: 4000 },
  'child': { label: 'Child Relief', limit: 8000 },
  'disabled_spouse': { label: 'Disabled Spouse', limit: 5000 },
  'disabled_child': { label: 'Disabled Child', limit: 6000 },
};

const ALERT_THRESHOLD = 80; // Alert when category reaches 80%

interface CategoryUtilization {
  categoryKey: string;
  categoryName: string;
  claimed: number;
  limit: number;
  utilization: number;
}

/**
 * Get user's category utilization for a specific year
 */
async function getCategoryUtilization(
  userId: string,
  year: number
): Promise<CategoryUtilization[]> {
  // Fetch all transactions for the user in the given year
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('tax_relief_category, amount')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .not('tax_relief_category', 'is', null)
    .neq('tax_relief_category', 'non_deductible');

  if (error) {
    console.error('Error fetching transactions for alerts:', error);
    return [];
  }

  console.log(`Alert check: Found ${transactions?.length || 0} tax-deductible transactions for ${year}`);

  // Sum up amounts by category
  const categoryTotals: Record<string, number> = {};
  for (const tx of transactions || []) {
    if (tx.tax_relief_category) {
      categoryTotals[tx.tax_relief_category] = 
        (categoryTotals[tx.tax_relief_category] || 0) + (tx.amount || 0);
    }
  }

  // Calculate utilization for each category
  const utilizations: CategoryUtilization[] = [];
  for (const [categoryKey, claimed] of Object.entries(categoryTotals)) {
    const categoryInfo = TAX_RELIEF_CATEGORIES[categoryKey];
    if (categoryInfo && categoryInfo.limit > 0) {
      const utilization = Math.round((claimed / categoryInfo.limit) * 100);
      utilizations.push({
        categoryKey,
        categoryName: categoryInfo.label,
        claimed: Math.min(claimed, categoryInfo.limit), // Cap at limit
        limit: categoryInfo.limit,
        utilization,
      });
    }
  }

  return utilizations;
}

/**
 * Check and send alerts for categories that have reached the threshold
 */
export async function checkAndSendAlerts(userId: string): Promise<void> {
  // Get user info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single();

  if (userError || !user?.email) {
    console.error('Error fetching user for alerts:', userError);
    return;
  }

  const currentYear = new Date().getFullYear();
  const utilizations = await getCategoryUtilization(userId, currentYear);

  // Filter categories that have reached the threshold
  const alertableCategories = utilizations.filter(
    (cat) => cat.utilization >= ALERT_THRESHOLD
  );

  console.log(`Found ${alertableCategories.length} categories at/above ${ALERT_THRESHOLD}% for user ${userId}`);

  for (const category of alertableCategories) {
    // Determine the threshold level (80%, 90%, 100%)
    let thresholdLevel = 80;
    if (category.utilization >= 100) {
      thresholdLevel = 100;
    } else if (category.utilization >= 90) {
      thresholdLevel = 90;
    }

    // Check if we already sent an alert for this threshold
    const alreadySent = await wasAlertSent(
      userId,
      category.categoryKey,
      currentYear,
      thresholdLevel
    );

    if (alreadySent) {
      console.log(`Alert already sent for ${category.categoryName} at ${thresholdLevel}%`);
      continue;
    }

    // Send the alert email
    const success = await sendCategoryAlertEmail(
      userId,
      user.email,
      {
        categoryName: category.categoryName,
        categoryKey: category.categoryKey,
        claimed: category.claimed,
        limit: category.limit,
        utilization: category.utilization,
        year: currentYear,
      },
      user.name || undefined
    );

    if (success) {
      // Record that we sent this alert
      await recordAlertSent(userId, category.categoryKey, currentYear, thresholdLevel);
      console.log(`Alert sent for ${category.categoryName} at ${thresholdLevel}%`);
    }
  }
}

/**
 * Wrapper function to be called after transaction operations
 * Runs asynchronously to not block the main request
 */
export function triggerAlertCheck(userId: string): void {
  // Run async without blocking
  setImmediate(() => {
    checkAndSendAlerts(userId).catch((err) => {
      console.error('Error in alert check:', err);
    });
  });
}

