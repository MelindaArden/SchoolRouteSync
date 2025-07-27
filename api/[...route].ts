import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Basic API endpoint to test deployment
  if (req.url === '/api/health') {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Route Runner API is running on Vercel',
      timestamp: new Date().toISOString()
    });
  }

  // For now, return a helpful message for other routes
  return res.status(200).json({
    message: 'Route Runner API - Full functionality coming soon',
    url: req.url,
    method: req.method,
    note: 'This is a simplified handler for initial Vercel deployment testing'
  });
}
