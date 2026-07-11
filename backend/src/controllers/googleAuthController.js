import fetch from 'node-fetch';

/**
 * POST /api/auth/google
 * Verifies a Google ID token from the client-side GSI library.
 * Returns decoded user info (name, email, picture) on success.
 */
export const verifyGoogleToken = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential token.' });
  }

  try {
    // Use Google's tokeninfo endpoint to verify and decode the ID token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    const payload = await response.json();

    if (!response.ok || payload.error) {
      console.error('[Google Auth] Token verification failed:', payload.error_description || payload.error);
      return res.status(401).json({ error: 'Invalid or expired Google token.' });
    }

    // Verify the token was issued for our app
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      console.error('[Google Auth] Token audience mismatch:', payload.aud, '!=', clientId);
      return res.status(401).json({ error: 'Token was not issued for this application.' });
    }

    // Extract user info from the verified payload
    const user = {
      sub: payload.sub,           // Google user ID
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified === 'true'
    };

    console.log(`[Google Auth] ✓ User verified: ${user.name} <${user.email}>`);
    return res.json({ success: true, user });

  } catch (err) {
    console.error('[Google Auth] Server error during token verification:', err.message);
    return res.status(500).json({ error: 'Failed to verify Google token.' });
  }
};
