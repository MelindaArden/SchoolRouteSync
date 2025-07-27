import { Pool } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        isAuthenticated: false,
        message: 'No valid token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token.startsWith('token_')) {
      return res.status(401).json({ 
        isAuthenticated: false,
        message: 'Invalid token format' 
      });
    }

    const userId = token.split('_')[1];
    
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const query = `
      SELECT id, username, role, "businessId", "firstName", "lastName", email, "notificationEmail"
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        isAuthenticated: false,
        message: 'User not found' 
      });
    }

    const user = result.rows[0];
    
    return res.status(200).json({
      isAuthenticated: true,
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Session error:', error);
    return res.status(401).json({ 
      isAuthenticated: false,
      message: 'Session validation failed',
      error: error.message 
    });
  }
}
