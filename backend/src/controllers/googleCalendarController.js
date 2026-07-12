import { dbGet, dbRun } from '../config/db.js';
import * as calendarService from '../services/googleCalendarService.js';

const MANAGER_URL = process.env.MANAGER_URL || 'http://localhost:3001';

/**
 * GET /api/auth/google/calendar/auth-url
 * Returns the Google Calendar OAuth2 URL for initiating consent screen redirection
 */
export const getGoogleCalendarAuthUrl = async (req, res) => {
  try {
    const authUrl = calendarService.getAuthUrl();
    return res.json({ success: true, authUrl });
  } catch (err) {
    console.error('[Calendar Controller] Error generating auth URL:', err.message);
    return res.status(500).json({ error: 'Failed to generate authorization URL.' });
  }
};

/**
 * POST /api/auth/google/calendar/exchange-code
 * Handles OAuth callback code from client popup, exchanges it with redirect_uri: 'postmessage', and stores in DB
 */
export const exchangeAuthCode = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required.' });
  }

  try {
    console.log('[Calendar Controller] Exchanging auth code for tokens via postmessage...');
    const tokens = await calendarService.getTokensFromCode(code, 'postmessage');
    
    // Save tokens in database settings
    const existing = await dbGet("SELECT value FROM settings WHERE key = 'google_calendar_token'");
    let finalTokens = tokens;
    if (existing && existing.value) {
      try {
        const parsed = JSON.parse(existing.value);
        if (!tokens.refresh_token && parsed.refresh_token) {
          finalTokens.refresh_token = parsed.refresh_token;
        }
      } catch (_) {}
    }

    await dbRun(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('google_calendar_token', ?)",
      [JSON.stringify(finalTokens)]
    );

    // Sync existing approved bookings in background
    calendarService.syncAllApprovedBookings().catch(err => console.error('[Google Calendar] Background sync error:', err.message));

    console.log('[Calendar Controller] ✓ Google Calendar connected successfully for (postmessage):', finalTokens.email);
    return res.json({ success: true, email: finalTokens.email });

  } catch (err) {
    console.error('[Calendar Controller] Exchange code error:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to exchange authorization code.' });
  }
};

/**
 * GET /api/auth/google/calendar/callback
 * Handles OAuth callback code, exchanges it for token and stores in DB
 */
export const handleGoogleCalendarCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${MANAGER_URL}/?activeTab=settings&calendarConnect=error&message=code_missing`);
  }

  try {
    console.log('[Calendar Controller] Exchanging auth code for tokens...');
    const tokens = await calendarService.getTokensFromCode(code);
    
    // Save tokens in database settings
    // If we already had tokens, only update refresh_token if a new one is returned (Google sometimes omits it on re-auth unless force-prompted)
    const existing = await dbGet("SELECT value FROM settings WHERE key = 'google_calendar_token'");
    let finalTokens = tokens;
    if (existing && existing.value) {
      try {
        const parsed = JSON.parse(existing.value);
        if (!tokens.refresh_token && parsed.refresh_token) {
          finalTokens.refresh_token = parsed.refresh_token;
        }
      } catch (_) {}
    }

    await dbRun(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('google_calendar_token', ?)",
      [JSON.stringify(finalTokens)]
    );

    // Sync existing approved bookings in background
    calendarService.syncAllApprovedBookings().catch(err => console.error('[Google Calendar] Background sync error:', err.message));

    console.log('[Calendar Controller] ✓ Google Calendar connected successfully for:', finalTokens.email);
    return res.redirect(`${MANAGER_URL}/?activeTab=settings&calendarConnect=success`);

  } catch (err) {
    console.error('[Calendar Controller] OAuth callback error:', err.message);
    return res.redirect(`${MANAGER_URL}/?activeTab=settings&calendarConnect=error&message=${encodeURIComponent(err.message)}`);
  }
};

/**
 * GET /api/auth/google/calendar/status
 * Check if calendar is connected and returns connected email account details
 */
export const getCalendarConnectionStatus = async (req, res) => {
  try {
    const tokenSetting = await dbGet("SELECT value FROM settings WHERE key = 'google_calendar_token'");
    if (!tokenSetting || !tokenSetting.value) {
      return res.json({ connected: false });
    }

    const tokenInfo = JSON.parse(tokenSetting.value);
    if (!tokenInfo.refresh_token) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      email: tokenInfo.email || 'Connected Account',
    });
  } catch (err) {
    console.error('[Calendar Controller] Error fetching connection status:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/auth/google/calendar/disconnect
 * Disconnect Google Calendar and wipe token from database
 */
export const disconnectCalendar = async (req, res) => {
  try {
    await dbRun("DELETE FROM settings WHERE key = 'google_calendar_token'");
    console.log('[Calendar Controller] Google Calendar disconnected.');
    return res.json({ success: true, message: 'Google Calendar disconnected successfully.' });
  } catch (err) {
    console.error('[Calendar Controller] Error disconnecting calendar:', err.message);
    return res.status(500).json({ error: 'Failed to disconnect Google Calendar.' });
  }
};

/**
 * POST /api/auth/google/calendar/sync
 * Manually trigger sync of unsynced approved bookings
 */
export const triggerManualSync = async (req, res) => {
  try {
    console.log('[Calendar Controller] Manual sync triggered by photographer...');
    const count = await calendarService.syncAllApprovedBookings();
    return res.json({ success: true, syncedCount: count });
  } catch (err) {
    console.error('[Calendar Controller] Manual sync error:', err.message);
    return res.status(500).json({ error: 'Failed to sync calendar bookings.' });
  }
};
