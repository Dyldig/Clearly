// Shared Microsoft identity platform / Graph helpers. Underscore-prefixed —
// not treated as a route by Vercel.

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI;

const AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
// offline_access gets us a refresh token; the "common" tenant + this scope
// combination works for both personal Microsoft accounts and work/school ones.
// Mail.Read was added after the initial calendar-only build — anyone who
// connected before that needs to disconnect and reconnect to grant it.
const SCOPE = 'offline_access Calendars.ReadWrite Mail.Read';

function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPE,
    prompt: 'consent',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: MICROSOFT_REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: SCOPE,
    }),
  });
  if (!resp.ok) throw new Error(`Microsoft token exchange failed: ${resp.status} ${await resp.text()}`);
  return resp.json(); // { access_token, refresh_token, expires_in, ... }
}

async function refreshTokens(refreshToken) {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPE,
    }),
  });
  if (!resp.ok) throw new Error(`Microsoft token refresh failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

// Reads the stored connection, refreshing (and re-persisting) the access
// token if it's expired or about to be. Throws Error('not_connected') if
// there's no stored connection at all — callers should treat that as a 409,
// not a 500. `supabase` is the fetch-wrapper helper from _lib.js.
async function getValidAccessToken(supabase) {
  const resp = await supabase('calendar_connections?user_id=eq.sarah&provider=eq.microsoft&select=*');
  if (!resp.ok) throw new Error(`Supabase read failed: ${resp.status} ${await resp.text()}`);
  const rows = await resp.json();
  if (!rows.length) throw new Error('not_connected');
  const conn = rows[0];

  if (new Date(conn.expires_at).getTime() > Date.now() + 60000) {
    return conn.access_token;
  }

  const refreshed = await refreshTokens(conn.refresh_token);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  const patchResp = await supabase(`calendar_connections?id=eq.${conn.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || conn.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!patchResp.ok) throw new Error(`Supabase token update failed: ${patchResp.status} ${await patchResp.text()}`);
  return refreshed.access_token;
}

module.exports = { buildAuthorizeUrl, exchangeCodeForTokens, getValidAccessToken };
