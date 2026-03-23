import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { phone, page, address } = req.body || {};
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
      
      signups.push({
        phone: phone.trim(),
        page: page || 'unknown',
        address: address || '',
        timestamp: new Date().toISOString()
      });
      
      // Write back
      await put('signups.json', JSON.stringify(signups, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });
      
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