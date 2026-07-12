import fetch from 'node-fetch';
import { dbGet, dbRun, dbQuery } from '../config/db.js';

// Redirect URI for Google Calendar OAuth Callback
const REDIRECT_URI = process.env.BACKEND_URL
  ? `${process.env.BACKEND_URL}/api/auth/google/calendar/callback`
  : 'http://localhost:5000/api/auth/google/calendar/callback';

/**
 * Generate Google Calendar OAuth authorization URL
 */
export function getAuthUrl() {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: REDIRECT_URI,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    prompt: 'consent', // Required to force Google to return refresh_token every time
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export async function getTokensFromCode(code, redirectUri = REDIRECT_URI) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange code for tokens');
  }

  // Get user info (email) from tokeninfo endpoint to know which email was connected
  let email = '';
  if (data.id_token) {
    try {
      const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${data.id_token}`);
      const info = await infoRes.json();
      if (infoRes.ok && info.email) {
        email = info.email;
      }
    } catch (e) {
      console.error('[Google Calendar] Failed to fetch token info:', e.message);
    }
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    email,
  };
}

/**
 * Refresh the access token using refresh_token
 */
export async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh access token');
  }

  return data.access_token;
}

/**
 * Get active Calendar Access Token (refreshes if needed)
 */
async function getActiveAccessToken() {
  const tokenSetting = await dbGet("SELECT value FROM settings WHERE key = 'google_calendar_token'");
  if (!tokenSetting || !tokenSetting.value) return null;

  try {
    const tokenInfo = JSON.parse(tokenSetting.value);
    if (!tokenInfo.refresh_token) return null;

    // To be safe, we always refresh the access token on usage so we don't have to manage expiry timestamps locally
    const freshAccessToken = await refreshAccessToken(tokenInfo.refresh_token);
    
    // Update active access token in settings
    tokenInfo.access_token = freshAccessToken;
    await dbRun(
      "UPDATE settings SET value = ? WHERE key = 'google_calendar_token'",
      [JSON.stringify(tokenInfo)]
    );

    return freshAccessToken;
  } catch (err) {
    console.error('[Google Calendar] Error retrieving active access token:', err.message);
    return null;
  }
}

/**
 * Create or Update event in Google Calendar
 * Returns the Google Calendar event ID
 */
export async function upsertCalendarEvent(booking) {
  const accessToken = await getActiveAccessToken();
  if (!accessToken) {
    console.log('[Google Calendar] Not connected. Skipping calendar sync.');
    return null;
  }

  // Construct start/end DateTimes
  const dateStr = booking.event_date; // YYYY-MM-DD
  const startTime = booking.start_time || '09:00';
  const endTime = booking.end_time || '13:00';

  const startDateTime = `${dateStr}T${startTime}:00`;
  const endDateTime = `${dateStr}T${endTime}:00`;

  // Get job type label
  let jobTypeLabel = booking.job_type || 'อื่นๆ';
  if (booking.job_type === 'wedding') jobTypeLabel = 'งานแต่งงาน';
  else if (booking.job_type === 'portrait') jobTypeLabel = 'พอร์ตเทรต';
  else if (booking.job_type === 'event') jobTypeLabel = 'Event';
  else if (booking.job_type === 'graduation') jobTypeLabel = 'รับปริญญา';
  else if (booking.job_type === 'product') jobTypeLabel = 'ถ่ายสินค้า';
  else if (booking.job_type === 'family') jobTypeLabel = 'ครอบครัว';

  // Get tracking code
  let trackingCode = '------';
  try {
    const jobRow = await dbGet("SELECT tracking_code FROM jobs WHERE booking_id = ?", [booking.id]);
    if (jobRow) {
      trackingCode = jobRow.tracking_code;
    }
  } catch (_) {}

  const eventPayload = {
    summary: `[ตีนแมวfoto] งาน${jobTypeLabel} - คุณ${booking.client_name}`,
    location: booking.location || 'ในสถานที่',
    description: `รายละเอียดคิวงาน: ${booking.details || booking.note || 'ไม่มี'}\n\nช่องทางติดต่อ: ${booking.contact}\nอีเมล: ${booking.email || 'ไม่มี'}\nราคาแพ็กเกจ: ฿${(booking.price || 0).toLocaleString()} บาท\nเงินมัดจำชำระแล้ว: ฿${(booking.deposit || 0).toLocaleString()} บาท\nรหัสติดตามคิวงาน: ${trackingCode}`,
    start: {
      dateTime: startDateTime,
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Asia/Bangkok',
    },
  };

  const isUpdate = !!booking.google_event_id;
  const url = isUpdate
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.google_event_id}`
    : `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

  const method = isUpdate ? 'PUT' : 'POST';

  console.log(`[Google Calendar] ${method === 'POST' ? 'Creating' : 'Updating'} event for booking ID ${booking.id}...`);

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(eventPayload),
  });

  const result = await response.json();
  if (!response.ok) {
    console.error('[Google Calendar] API Request Failed:', result.error ? result.error.message : result);
    
    // If the event was not found during update (e.g. manually deleted from Calendar), try recreating it
    if (isUpdate && response.status === 404) {
      console.log('[Google Calendar] Event not found. Re-creating as new event...');
      // Clear old invalid event ID and try again
      await dbRun("UPDATE bookings SET google_event_id = NULL WHERE id = ?", [booking.id]);
      booking.google_event_id = null;
      return upsertCalendarEvent(booking);
    }
    
    return null;
  }

  // Save the Google event ID to the booking table
  const newEventId = result.id;
  if (!isUpdate) {
    await dbRun("UPDATE bookings SET google_event_id = ? WHERE id = ?", [newEventId, booking.id]);
    console.log(`[Google Calendar] ✓ Event created successfully. ID: ${newEventId}`);
  } else {
    console.log(`[Google Calendar] ✓ Event updated successfully. ID: ${newEventId}`);
  }

  return newEventId;
}

/**
 * Delete event from Google Calendar
 */
export async function deleteCalendarEvent(googleEventId) {
  if (!googleEventId) return;

  const accessToken = await getActiveAccessToken();
  if (!accessToken) return;

  console.log(`[Google Calendar] Deleting calendar event ID: ${googleEventId}...`);

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok || response.status === 404 || response.status === 410) {
      console.log(`[Google Calendar] ✓ Event deleted successfully (or already gone).`);
    } else {
      const err = await response.json();
      console.error('[Google Calendar] Delete failed:', err.error ? err.error.message : err);
    }
  } catch (err) {
    console.error('[Google Calendar] Error deleting calendar event:', err.message);
  }
}

/**
 * Sync all approved bookings that don't have a google_event_id yet
 */
export async function syncAllApprovedBookings() {
  console.log('[Google Calendar] Checking for approved bookings to sync...');
  try {
    const bookings = await dbQuery(
      "SELECT * FROM bookings WHERE status = 'approved' AND (google_event_id IS NULL OR google_event_id = '')"
    );

    if (bookings.length === 0) {
      console.log('[Google Calendar] No unsynced approved bookings found.');
      return 0;
    }

    console.log(`[Google Calendar] Found ${bookings.length} unsynced approved bookings. Syncing now...`);
    let count = 0;
    for (const booking of bookings) {
      const eventId = await upsertCalendarEvent(booking);
      if (eventId) count++;
    }
    console.log(`[Google Calendar] Successfully synced ${count}/${bookings.length} bookings.`);
    return count;
  } catch (err) {
    console.error('[Google Calendar] Error syncing all approved bookings:', err.message);
    return 0;
  }
}
