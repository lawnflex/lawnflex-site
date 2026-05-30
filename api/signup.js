import { put, list } from '@vercel/blob';

const NOTIFY_EMAIL = 'sales@icgbeachwalk.com';
const FORMSPREE_ID = 'mgonnnnw';

async function sendEmailAlert(signup) {
  try {
    await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _replyto: NOTIFY_EMAIL,
        email: NOTIFY_EMAIL,
        _subject: `🌱 New LawnFlex signup: ${signup.phone}`,
        phone: signup.phone,
        address: signup.address || '(not provided)',
        grassType: signup.grassType || '(not provided)',
        lawnSize: signup.lawnSize || '(not provided)',
        soilTemp: signup.soilTemp || '(not provided)',
        region: signup.region || '(not provided)',
        signedUpAt: signup.timestamp,
        totalSignups: signup.totalCount,
        message: `New signup alert\n\nPhone: ${signup.phone}\nAddress: ${signup.address || '(not provided)'}\nGrass type: ${signup.grassType || '(not provided)'}\nLawn size: ${signup.lawnSize || '(not provided)'}\nSoil temp: ${signup.soilTemp || '(not provided)'}\nRegion: ${signup.region || '(not provided)'}\nSigned up: ${signup.timestamp}\nTotal signups: ${signup.totalCount}`
      })
    });
  } catch (e) {
    console.warn('Email alert failed (non-fatal):', e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { phone, page, address, grassType, lawnSize, soilTemp, region } = req.body || {};
      if (!phone) return res.status(400).json({ error: 'Phone required' });

      // Read existing signups from blob
      let signups = [];
      try {
        const { blobs } = await list({ prefix: 'signups.json' });
        if (blobs.length > 0) {
          const resp = await fetch(blobs[0].downloadUrl);
          if (resp.ok) signups = await resp.json();
        }
      } catch (e) {
        signups = [];
      }

      // Dedupe by phone
      if (signups.some(s => s.phone === phone.trim())) {
        return res.status(200).json({ success: true, message: 'Already signed up' });
      }

      const newSignup = {
        phone: phone.trim(),
        page: page || 'unknown',
        address: address || '',
        grassType: grassType || '',
        lawnSize: lawnSize || '',
        soilTemp: soilTemp || '',
        region: region || '',
        timestamp: new Date().toISOString()
      };

      signups.push(newSignup);

      // Write back to blob
      await put('signups.json', JSON.stringify(signups, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });

      // Fire email alert (non-blocking — don't await, don't fail if it errors)
      sendEmailAlert({ ...newSignup, totalCount: signups.length });

      return res.status(200).json({ success: true, count: signups.length });
    }

    if (req.method === 'GET') {
      let signups = [];
      try {
        const { blobs } = await list({ prefix: 'signups.json' });
        if (blobs.length > 0) {
          const resp = await fetch(blobs[0].downloadUrl);
          if (resp.ok) signups = await resp.json();
        }
      } catch (e) {
        signups = [];
      }
      return res.status(200).json({ count: signups.length, signups });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Signup error:', error.message, error.stack);
    return res.status(500).json({ error: 'Server error', detail: error.message });
  }
}
