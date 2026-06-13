/**
 * API Route: POST /api/save-ad-click
 *
 * Serverless function (Vercel-compatible).
 * Καταγράφει κάθε click στο ad campaign modal.
 *
 * Payload:
 * {
 *   "campaignId": "advertise-here-1",
 *   "day": 123,
 *   "timestamp": "2026-06-12T10:22:31.123Z"
 * }
 */

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};

    const record = {
      campaignId: String(body.campaignId || 'unknown'),
      day: Number(body.day) || 0,
      clientTimestamp: body.timestamp || null,
      receivedAt: new Date().toISOString(),
      userAgent: req.headers['user-agent'] || null,
      ip: (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown')
            .toString().split(',')[0].trim()
    };

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const filePath = path.join(dataDir, 'ad-clicks.json');

    let clicks = [];
    if (fs.existsSync(filePath)) {
      try { clicks = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { clicks = []; }
      if (!Array.isArray(clicks)) clicks = [];
    }

    clicks.push(record);
    fs.writeFileSync(filePath, JSON.stringify(clicks, null, 2), 'utf8');

    return res.status(200).json({ ok: true, saved: true });
  } catch (err) {
    console.error('[save-ad-click] Error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to save click' });
  }
};
