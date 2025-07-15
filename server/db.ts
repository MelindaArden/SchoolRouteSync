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
  max: 2, // Drastically reduced for stability
  idleTimeoutMillis: 10000, // Very short idle timeout
  connectionTimeoutMillis: 3000, // Very quick connection timeout
  maxUses: 100, // Very low reuse limit
  allowExitOnIdle: true, // Allow pool to close gracefully
  statement_timeout: 3000, // 3 second statement timeout
  query_timeout: 3000 // 3 second query timeout
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't crash the server, just log the error
});

export const db = drizzle({ client: pool, schema });