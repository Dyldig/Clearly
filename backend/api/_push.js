// Web Push sending, shared by the ingestion pipeline. Underscore-prefixed —
// not treated as a route by Vercel.
const webpush = require('web-push');
const { supabase } = require('./_lib');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Sends a "new message" notification to every subscribed browser, skipping
// ones that only want action-required messages if this one isn't. Never
// throws — a push failure should never break ingestion. Expired
// subscriptions (410 Gone / 404) are deleted so they stop being tried.
async function notifyNewMessage({ title, summary, actionRequired, channel }) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return; // not configured yet

  try {
    const resp = await supabase('push_subscriptions?select=*');
    if (!resp.ok) throw new Error(`Supabase read failed: ${resp.status} ${await resp.text()}`);
    const subs = await resp.json();

    const payload = JSON.stringify({
      title: channel ? `${channel}: ${title}` : title,
      body: summary || '',
      actionRequired: !!actionRequired,
    });

    await Promise.all(subs.map(async (sub) => {
      if (sub.notify_action_only && !actionRequired) return;
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase(`push_subscriptions?id=eq.${sub.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        } else {
          console.error('[push] send failed:', err && err.message || err);
        }
      }
    }));
  } catch (err) {
    console.error('[push] notifyNewMessage failed:', err);
  }
}

module.exports = { notifyNewMessage };
