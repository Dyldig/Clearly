// GET /api/auth/microsoft/callback -> Microsoft redirects here with a `code`
// after the user approves. Exchanges it for tokens, stores them, and sends
// the browser back to the app.
const { exchangeCodeForTokens } = require('../../_microsoft');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;

module.exports = async (req, res) => {
  const code = req.query && req.query.code;
  if (!code) {
    res.writeHead(302, { Location: `${FRONTEND_URL}?calendar=error` });
    res.end();
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Best-effort — shown read-only in Settings so it's clear which inbox is
    // synced. Not worth failing the whole connect flow if this one call trips.
    let accountEmail = null;
    try {
      const meResp = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (meResp.ok) {
        const me = await meResp.json();
        accountEmail = me.mail || me.userPrincipalName || null;
      }
    } catch (err) {
      console.error('[auth/microsoft/callback] /me lookup failed:', err);
    }

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/calendar_connections?on_conflict=user_id,provider`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: 'sarah',
        provider: 'microsoft',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        account_email: accountEmail,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!resp.ok) throw new Error(`Supabase upsert failed: ${resp.status} ${await resp.text()}`);

    res.writeHead(302, { Location: `${FRONTEND_URL}?calendar=connected` });
    res.end();
  } catch (err) {
    console.error('[auth/microsoft/callback] failed:', err);
    res.writeHead(302, { Location: `${FRONTEND_URL}?calendar=error` });
    res.end();
  }
};
