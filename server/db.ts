import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduced pool size for stability
  idleTimeoutMillis: 20000, // Shorter idle timeout
  connectionTimeoutMillis: 8000, // Longer connection timeout
  maxUses: 7500, // Limit connection reuse
  allowExitOnIdle: true // Allow pool to close gracefully
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't crash the server, just log the error
});

export const db = drizzle({ client: pool, schema });