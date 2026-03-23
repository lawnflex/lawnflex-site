import { put, list, head } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { phone, page, address } = req.body || {};
      
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      // Create a signup record
      const signup = {
        phone: phone.trim(),
        page: page || 'unknown',
        address: address || '',
        timestamp: new Date().toISOString(),
        ip: req.headers['x-forwarded-for'] || 'unknown'
      };
      
      // Read existing signups
      let signups = [];
      try {
        const existing = await fetch(process.env.BLOB_READ_WRITE_TOKEN ? 
          'https://lawnflex-blob.public.blob.vercel-storage.com/signups.json' : '');
        // Try to read from blob
        const { blobs } = await list({ prefix: 'signups' });
        if (blobs.length > 0) {
          const resp = await fetch(blobs[0].url, {
            headers: { 'Authorization': 'Bearer ' + process.env.BLOB_READ_WRITE_TOKEN }
          });
          if (resp.ok) {
            signups = await resp.json();
          }
        }
      } catch (e) {
        // First signup - empty array is fine
        signups = [];
      }
      
      // Check for duplicate phone
      const exists = signups.some(s => s.phone === signup.phone);
      if (exists) {
        return res.status(200).json({ success: true, message: 'Already signed up' });
      }
      
      // Add new signup
      signups.push(signup);
      
      // Save back to blob
      await put('signups.json', JSON.stringify(signups, null, 2), {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json'
      });
      
      return res.status(200).json({ success: true, message: 'Signed up!', count: signups.length });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  if (req.method === 'GET') {
    // Admin endpoint to view signups
    try {
      const { blobs } = await list({ prefix: 'signups' });
      if (blobs.length > 0) {
        const resp = await fetch(blobs[0].url, {
          headers: { 'Authorization': 'Bearer ' + process.env.BLOB_READ_WRITE_TOKEN }
        });
        const signups = await resp.json();
        return res.status(200).json({ count: signups.length, signups });
      }
      return res.status(200).json({ count: 0, signups: [] });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}