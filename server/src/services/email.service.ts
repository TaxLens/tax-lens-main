import { Resend } from 'resend';
import { supabase } from '../lib/supabase.js';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender - use your verified domain or Resend's default
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'TaxLens <onboarding@resend.dev>';

interface CategoryAlertData {
  categoryName: string;
  categoryKey: string;
  claimed: number;
  limit: number;
  utilization: number;
  year: number;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate HTML email template for category alert
 */
function generateAlertEmailHTML(data: CategoryAlertData, userName?: string): string {
  const progressColor = data.utilization >= 100 ? '#22c55e' : '#f59e0b';
  const statusText = data.utilization >= 100 ? 'Fully Utilized!' : `${data.utilization}% Utilized`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaxLens Category Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">TaxLens</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Tax Relief Category Alert</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px;">
                Hi${userName ? ` ${userName}` : ''},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px;">
                Great news! Your <strong>${data.categoryName}</strong> tax relief category has reached <strong>${data.utilization}%</strong> utilization for Year of Assessment ${data.year}.
              </p>
              
              <!-- Progress Card -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Category</p>
                    <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">${data.categoryName}</p>
                    
                    <!-- Progress Bar -->
                    <div style="background-color: #e2e8f0; border-radius: 8px; height: 12px; overflow: hidden; margin-bottom: 16px;">
                      <div style="background-color: ${progressColor}; height: 100%; width: ${Math.min(data.utilization, 100)}%; border-radius: 8px;"></div>
                    </div>
                    
                    <table role="presentation" width="100%">
                      <tr>
                        <td style="text-align: left;">
                          <p style="margin: 0; color: #64748b; font-size: 12px;">Claimed</p>
                          <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">${formatCurrency(data.claimed)}</p>
                        </td>
                        <td style="text-align: center;">
                          <p style="margin: 0; color: #64748b; font-size: 12px;">Status</p>
                          <p style="margin: 4px 0 0 0; color: ${progressColor}; font-size: 16px; font-weight: 600;">${statusText}</p>
                        </td>
                        <td style="text-align: right;">
                          <p style="margin: 0; color: #64748b; font-size: 12px;">Limit</p>
                          <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">${formatCurrency(data.limit)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${data.utilization >= 100 ? `
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  🎉 <strong>Congratulations!</strong> You've maximized this tax relief category. Any additional expenses in this category won't provide additional tax benefits.
                </p>
              </div>
              ` : `
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  💡 <strong>Almost there!</strong> You have ${formatCurrency(data.limit - data.claimed)} remaining in this category before reaching the maximum limit.
                </p>
              </div>
              `}
              
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
                View your full tax relief breakdown and track all your deductions in the TaxLens app.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%">
                <tr>
                  <td align="center">
                    <a href="${process.env.WEB_APP_URL || 'http://localhost:3000'}/relief" 
                       style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View Tax Relief Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
                This is an automated notification from TaxLens.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} TaxLens. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Send category alert email to user using Resend
 */
export async function sendCategoryAlertEmail(
  userId: string,
  userEmail: string,
  data: CategoryAlertData,
  userName?: string
): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return false;
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `🎯 TaxLens Alert: ${data.categoryName} is ${data.utilization}% utilized`,
      html: generateAlertEmailHTML(data, userName),
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return false;
    }

    console.log(`✅ Alert email sent to ${userEmail} for category ${data.categoryName}`);
    return true;
  } catch (error) {
    console.error('Error sending alert email:', error);
    return false;
  }
}

/**
 * Check if alert was already sent for this category/threshold
 */
export async function wasAlertSent(
  userId: string,
  categoryKey: string,
  year: number,
  threshold: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('category_alerts')
    .select('id')
    .eq('user_id', userId)
    .eq('category', categoryKey)
    .eq('year', year)
    .eq('threshold', threshold)
    .single();

  return !error && !!data;
}

/**
 * Record that an alert was sent
 */
export async function recordAlertSent(
  userId: string,
  categoryKey: string,
  year: number,
  threshold: number
): Promise<void> {
  await supabase.from('category_alerts').insert({
    user_id: userId,
    category: categoryKey,
    year: year,
    threshold: threshold,
    sent_at: new Date().toISOString(),
  });
}
