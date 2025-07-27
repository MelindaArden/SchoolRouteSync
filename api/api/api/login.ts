import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and } from 'drizzle-orm';
import { pgTable, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import ws from 'ws';
import * as bcrypt from 'bcryptjs';

// Define schema inline for Vercel compatibility
const businesses = pgTable('businesses', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const users = pgTable('users', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  username: varchar('username', { length: 50 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 20 }).notNull().default('driver'),
  businessId: integer('business_id').notNull(),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  notificationEmail: varchar('notification_email', { length: 255 }),
});

// Configure Neon for serverless
neonConfig.webSocketConstructor = ws;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password, businessName } = req.body;

  if (!username || !password || !businessName) {
    return res.status(400).json({ message: 'Username, password, and business name are required' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ message: 'Database configuration missing' });
  }

  try {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 15000
    });
    const db = drizzle({ client: pool });

    // Find business first
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.name, businessName.toLowerCase()))
      .limit(1);

    if (!business) {
      return res.status(401).json({ message: 'Invalid business name' });
    }

    // Find user in this business
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.username, username),
          eq(users.businessId, business.id)
        )
      )
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Return user data (excluding password)
    const { passwordHash, ...userData } = user;
    return res.status(200).json({
      user: userData,
      business: business,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Database connection error' });
  }
}
