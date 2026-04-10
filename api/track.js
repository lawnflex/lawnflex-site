import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { product, url, page } = req.body || {};
      if (!url) return res.status(400).json({ error: 'URL required' });
      
      let clicks = [];
      try {
        const { blobs } = await list({ prefix: 'clicks.json' });
        if (blobs.length > 0) {
          const resp = await fetch(blobs[0].downloadUrl);
          if (resp.ok) clicks = await resp.json();
        }
      } catch (e) { clicks = []; }
      
      clicks.push({
        product: product || 'unknown',
        url: url,
        page: page || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      await put('clicks.json', JSON.stringify(clicks, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });
      
      return res.status(200).json({ success: true, count: clicks.length });
    }
    
    if (req.method === 'GET') {
      let clicks = [];
      try {
        const { blobs } = await list({ prefix: 'clicks.json' });
        if (blobs.length > 0) {
          const resp = await fetch(blobs[0].downloadUrl);
          if (resp.ok) clicks = await resp.json();
        }
      } catch (e) { clicks = []; }
      
      // Summary by product
      const summary = {};
      clicks.forEach(c => {
        const key = c.product || 'unknown';
        if (!summary[key]) summary[key] = 0;
        summary[key]++;
      });
      
      return res.status(200).json({ totalClicks: clicks.length, byProduct: summary, clicks });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Track error:', error.message);
    return res.status(500).json({ error: 'Server error', detail: error.message });
  }
}