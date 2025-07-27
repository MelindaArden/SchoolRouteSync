import { Pool } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, password, businessName } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const query = `
      SELECT id, username, password, role, "businessId", "firstName", "lastName", email, "notificationEmail"
      FROM users 
      WHERE username = $1 AND "businessId" = $2
    `;
    
    const result = await pool.query(query, [username, businessName || 'tnt-gymnastics']);
    
    if (result.rows.length === 0 || result.rows[0].password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const authToken = `token_${user.id}_${Date.now()}`;
    
    return res.status(200).json({
      success: true,
      isAuthenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        businessId: user.businessId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        notificationEmail: user.notificationEmail
      },
      authToken: authToken,
      debug: {
        loginMethod: 'mobile',
        isMobile: true,
        sessionId: `mobile_${Date.now()}`
      }
    });

  } catch (error) {
    console.error('Mobile login error:', error);
    return res.status(500).json({ 
      message: 'Login failed', 
      error: error.message 
    });
  }
}
