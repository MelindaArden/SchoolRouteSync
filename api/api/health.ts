import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({ 
    status: 'healthy', 
    message: 'Route Runner API is running on Vercel - Updated',
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? 'Connected' : 'Missing',
    environment: 'production'
  });
}
