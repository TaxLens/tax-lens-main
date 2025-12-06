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

export async function fetchEmails(
  accessToken: string,
  maxResults: number = 50,
  query: string = ''
): Promise<EmailMessage[]> {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Search for potential transaction emails
  const transactionQuery = query || 'subject:(receipt OR invoice OR payment OR order OR purchase OR transaction OR confirmation) newer_than:30d';

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: transactionQuery,
  });

  const messages = listResponse.data.messages || [];
  const emails: EmailMessage[] = [];

  for (const message of messages) {
    if (!message.id) continue;

    const msgResponse = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'full',
    });

    const msgData = msgResponse.data;
    const headers = msgData.payload?.headers || [];

    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract body
    let body = '';
    const payload = msgData.payload;
    
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
      }
    }

    emails.push({
      id: message.id,
      threadId: message.threadId || '',
      subject: getHeader('Subject'),
      from: getHeader('From'),
      date: getHeader('Date'),
      snippet: msgData.snippet || '',
      body: body.substring(0, 5000), // Limit body size
    });
  }

  return emails;
}

