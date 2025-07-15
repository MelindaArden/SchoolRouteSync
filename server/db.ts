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
  max: 3, // Further reduced for stability
  idleTimeoutMillis: 15000, // Shorter idle timeout
  connectionTimeoutMillis: 5000, // Reduced connection timeout
  maxUses: 1000, // Much lower reuse limit
  allowExitOnIdle: true, // Allow pool to close gracefully
  statement_timeout: 5000, // 5 second statement timeout
  query_timeout: 5000 // 5 second query timeout
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't crash the server, just log the error
});

export const db = drizzle({ client: pool, schema });