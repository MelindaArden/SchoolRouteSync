import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';

// Create Express app
const app = express();

// Disable x-powered-by header
app.disable('x-powered-by');

// Initialize routes
let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!initialized) {
    try {
      await registerRoutes(app);
      initialized = true;
    } catch (error) {
      console.error('Failed to initialize routes:', error);
      return res.status(500).json({ error: 'Server initialization failed' });
    }
  }

  // Handle the request with Express
  app(req as any, res as any);
}
