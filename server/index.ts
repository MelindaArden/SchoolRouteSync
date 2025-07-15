import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startMissedSchoolMonitoring } from "./missed-school-monitor";

const app = express();

// Enhanced CORS headers for mobile Safari and deployment compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://routerunner.replit.app',
    'https://routerunner.replit.dev',
    process.env.REPLIT_DOMAIN && `https://${process.env.REPLIT_DOMAIN}`
  ].filter(Boolean);
  
  // Allow any .replit.app or .replit.dev domain for deployment
  if (origin && (origin.includes('.replit.app') || origin.includes('.replit.dev') || allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Production deployment session configuration 
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DOMAIN;

app.use(session({
  secret: process.env.SESSION_SECRET || 'school-bus-management-secret-key-2025',
  name: 'routerunner.sid',
  resave: true,
  saveUninitialized: true,
  rolling: true,
  cookie: {
    secure: false, // Must be false for HTTP and mixed environments
    httpOnly: false, // Allow JavaScript access for token fallback
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none', // Required for cross-origin deployment environments
    domain: undefined // Let browser decide the domain
  },
  proxy: true // Trust proxy for deployment environments
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced CORS and mobile compatibility headers
app.use((req, res, next) => {
  // Allow all origins for mobile compatibility
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Mobile-specific headers
  res.header('X-Content-Type-Options', 'nosniff');
  // Allow frames for Replit preview
  if (req.headers.host && req.headers.host.includes('.replit.dev')) {
    res.header('X-Frame-Options', 'ALLOWALL');
  } else {
    res.header('X-Frame-Options', 'SAMEORIGIN');
  }
  res.header('X-XSS-Protection', '1; mode=block');
  
  // Cache control for mobile
  if (req.path.startsWith('/api/')) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`Server accessible at:`);
    log(`- http://localhost:${port}`);
    log(`- http://0.0.0.0:${port}`);
    
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(',');
      domains.forEach(domain => {
        log(`- https://${domain}`);
      });
    }
    
    // Start missed school monitoring service
    startMissedSchoolMonitoring();
  });
})();
