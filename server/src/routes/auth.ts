import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { getAuthUrl, getTokensFromCode, getUserInfo } from '../services/gmail.service.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get Google OAuth URL
router.get('/google', async (req: Request, res: Response) => {
  try {
    const authUrl = await getAuthUrl();
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code required' });
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to get access token' });
    }

    // Get user info from Google
    const userInfo = await getUserInfo(tokens.access_token);
    
    if (!userInfo.email) {
      return res.status(400).json({ error: 'Failed to get user email' });
    }

    // Upsert user in database
    const { data: user, error: dbError } = await supabase
      .from('users')
      .upsert(
        {
          email: userInfo.email,
          name: userInfo.name || null,
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token || null,
        },
        {
          onConflict: 'email',
        }
      )
      .select()
      .single();

    if (dbError || !user) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save user' });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?error=auth_failed`);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, last_sync_at, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Logout (client-side, but we can track it)
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  // In a more complex setup, we might invalidate tokens here
  res.json({ message: 'Logged out successfully' });
});

export default router;

