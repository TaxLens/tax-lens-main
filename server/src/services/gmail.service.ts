import { google } from 'googleapis';
import { supabase } from '../lib/supabase.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

export async function getAuthUrl(): Promise<string> {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.readonly',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getUserInfo(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

export async function refreshAccessToken(userId: string): Promise<string | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  if (error || !user?.google_refresh_token) {
    return null;
  }

  oauth2Client.setCredentials({ refresh_token: user.google_refresh_token });
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (credentials.access_token) {
      await supabase
        .from('users')
        .update({ google_access_token: credentials.access_token })
        .eq('id', userId);
      
      return credentials.access_token;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
  
  return null;
}

/**
 * Get date range for email sync based on year
 * For prototype: November 1 to December 31 (or today for current year)
 */
function getDateRangeForYear(year?: number): { startDate: string; endDate: string } {
  const currentYear = new Date().getFullYear();
  const targetYear = year || currentYear;
  
  // Start from November 1st for prototype
  const startDate = `${targetYear}/11/1`;
  
  // If it's a past year, include up to Dec 31
  // If current year, go up to today
  if (targetYear < currentYear) {
    return { startDate, endDate: `${targetYear}/12/31` };
  }
  
  return { startDate, endDate: '' }; // No end date for current year (up to now)
}

/**
 * Extract email body from Gmail message payload
 */
function extractEmailBody(payload: any): string {
  let body = '';
  
  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload?.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        break;
      }
      if (part.mimeType === 'text/html' && part.body?.data && !body) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      // Handle nested parts (multipart messages)
      if (part.parts) {
        for (const nestedPart of part.parts) {
          if (nestedPart.mimeType === 'text/plain' && nestedPart.body?.data) {
            body = Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
            break;
          }
        }
      }
    }
  }
  
  return body;
}

/**
 * Fetch all primary inbox emails for a specific year or date range
 * Optimized with parallel batch fetching for better performance
 * @param accessToken - Gmail access token
 * @param maxResults - Maximum number of emails to fetch
 * @param year - Optional year to fetch emails for (Jan 1 - Dec 31)
 */
export async function fetchEmails(
  accessToken: string,
  maxResults: number = 100,
  year?: number
): Promise<EmailMessage[]> {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Get the date range for the specified year
  const { startDate, endDate } = getDateRangeForYear(year);
  
  // Query: Primary inbox emails within date range
  // category:primary ensures we only get main inbox emails (not promotions, social, updates)
  let query = `category:primary after:${startDate}`;
  if (endDate) {
    query += ` before:${endDate}`;
  }
  
  console.log(`Fetching emails with query: ${query}`);

  // Step 1: Collect all message IDs first (this is fast, just IDs)
  const messageIds: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;

  do {
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: Math.min(maxResults - messageIds.length, 100),
      q: query,
      pageToken,
    });

    const messages = listResponse.data.messages || [];
    pageToken = listResponse.data.nextPageToken || undefined;

    for (const message of messages) {
      if (message.id && messageIds.length < maxResults) {
        messageIds.push({ id: message.id, threadId: message.threadId || '' });
      }
    }
  } while (pageToken && messageIds.length < maxResults);

  console.log(`Found ${messageIds.length} email IDs, fetching details in parallel...`);

  // Step 2: Fetch message details in parallel batches
  const FETCH_BATCH_SIZE = 25; // Parallel requests per batch
  const emails: EmailMessage[] = [];
  const totalBatches = Math.ceil(messageIds.length / FETCH_BATCH_SIZE);

  for (let i = 0; i < messageIds.length; i += FETCH_BATCH_SIZE) {
    const batchNum = Math.floor(i / FETCH_BATCH_SIZE) + 1;
    const batch = messageIds.slice(i, i + FETCH_BATCH_SIZE);
    const batchStartTime = Date.now();

    // Fetch all messages in this batch in parallel
    const batchPromises = batch.map(async ({ id, threadId }) => {
      try {
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'full',
        });

        const msgData = msgResponse.data;
        const headers = msgData.payload?.headers || [];

        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

        const body = extractEmailBody(msgData.payload);

        return {
          id,
          threadId,
          subject: getHeader('Subject'),
          from: getHeader('From'),
          date: getHeader('Date'),
          snippet: msgData.snippet || '',
          body: body.substring(0, 8000),
        } as EmailMessage;
      } catch (err) {
        console.error(`Error fetching message ${id.substring(0, 8)}...:`, err);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter((r): r is EmailMessage => r !== null);
    emails.push(...validResults);

    const batchDuration = Date.now() - batchStartTime;
    console.log(`   📥 Fetch batch ${batchNum}/${totalBatches}: ${validResults.length}/${batch.length} emails in ${batchDuration}ms`);
  }

  console.log(`Fetched ${emails.length} emails from primary inbox for ${year || 'current'} year (${startDate}${endDate ? ` to ${endDate}` : ''})`);
  return emails;
}
