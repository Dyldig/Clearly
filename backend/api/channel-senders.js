// GET    /api/channel-senders                       -> list tracked senders
// POST   /api/channel-senders {matchPattern,channel} -> add a new one
// POST   /api/channel-senders {id, muted}            -> update mute state
// DELETE /api/channel-senders {id}                   -> stop tracking one
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;

  try {
    if (req.method === 'GET') {
      const resp = await supabase('channel_senders?select=id,match_pattern,channel,hue,muted&order=created_at.asc');
      if (!resp.ok) throw new Error(`Supabase read failed: ${resp.status} ${await resp.text()}`);
      const rows = await resp.json();
      res.status(200).json(rows.map(toChannelSender));
      return;
    }

    if (req.method === 'POST') {
      const { id, muted, matchPattern, channel } = req.body || {};

      if (id) {
        if (typeof muted !== 'boolean') { res.status(400).json({ error: 'nothing to update' }); return; }
        const resp = await supabase(`channel_senders?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ muted }),
        });
        if (!resp.ok) throw new Error(`Supabase update failed: ${resp.status} ${await resp.text()}`);
        res.status(200).json({ ok: true });
        return;
      }

      if (!matchPattern || !channel) { res.status(400).json({ error: 'matchPattern and channel required' }); return; }
      const resp = await supabase('channel_senders', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          match_pattern: matchPattern.trim().toLowerCase(),
          channel: channel.trim(),
          hue: hashHue(channel),
        }),
      });
      if (resp.status === 409) { res.status(409).json({ error: 'that sender is already tracked' }); return; }
      if (!resp.ok) throw new Error(`Supabase insert failed: ${resp.status} ${await resp.text()}`);
      const [row] = await resp.json();
      res.status(200).json(toChannelSender(row));
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) { res.status(400).json({ error: 'id required' }); return; }
      const resp = await supabase(`channel_senders?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      if (!resp.ok) throw new Error(`Supabase delete failed: ${resp.status} ${await resp.text()}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[channel-senders] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};

function toChannelSender(row) {
  return { id: row.id, matchPattern: row.match_pattern, channel: row.channel, hue: row.hue, muted: row.muted };
}

function hashHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}
