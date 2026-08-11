// Shared helpers for the browser-facing endpoints (messages.js, etc).
// Underscore-prefixed files under api/ are not treated as routes by Vercel.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLIENT_API_TOKEN = process.env.CLIENT_API_TOKEN;

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// Handles CORS + the shared-token check every browser-facing endpoint needs.
// Returns false (having already sent a response) when the caller should stop.
function guard(req, res) {
  withCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  // Fails closed: an unset token refuses everything rather than opening up.
  if (!CLIENT_API_TOKEN || req.headers.authorization !== `Bearer ${CLIENT_API_TOKEN}`) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

function supabase(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

module.exports = { guard, supabase };
