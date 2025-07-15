import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { startMissedSchoolMonitoring } from "./missed-school-monitor";

const app = express();

// Enhanced CORS headers for mobile Safari and deployment compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://schoolride.replit.app',
    'https://schoolride.replit.dev',
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
  name: 'schoolbus.sid',
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
  res.header('X-Frame-Options', 'SAMEORIGIN');
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

  // Setup vite in development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
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

// Remove the HTML content and restore normal structure
/*
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Route Runner - Working Now</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 100%;
            overflow: hidden;
        }
        .header {
            background: #1976D2;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .form-section { padding: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; color: #333; }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="text"]:focus, input[type="password"]:focus {
            outline: none;
            border-color: #1976D2;
        }
        .btn {
            width: 100%;
            padding: 12px;
            background: #1976D2;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.3s;
        }
        .btn:hover { background: #1565C0; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        .success {
            background: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 18px;
        }
        .error {
            background: #f44336;
            color: white;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        .info {
            background: #E3F2FD;
            color: #1976D2;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #1976D2;
        }
        .dashboard {
            display: none;
            padding: 20px;
            background: #f5f5f5;
            min-height: 100vh;
        }
        .dashboard.active { display: block; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-card h3 { color: #666; margin-bottom: 10px; }
        .stat-card .value { font-size: 32px; font-weight: bold; color: #1976D2; }
        .gps-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .logout-btn { background: #f44336; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; float: right; }
    </style>
</head>
<body>
    <div id="login-container" class="container">
        <div class="header">
            <h1>Route Runner</h1>
            <p>School Bus Route Management</p>
        </div>
        <div class="form-section">
            <div class="info">
                <strong>System Restored & Working</strong><br>
                Login credentials: ma1313 / Dietdew13!
            </div>
            <div id="error-message" class="error" style="display: none;"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" value="ma1313" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" value="Dietdew13!" required>
                </div>
                <button type="submit" class="btn" id="loginBtn">Login</button>
            </form>
        </div>
        <div id="success-message" class="success" style="display: none;">
            Login successful! Route Runner is now working.
        </div>
    </div>

    <div id="dashboard" class="dashboard">
        <h1>Route Runner - Admin Dashboard <button class="logout-btn" onclick="logout()">Logout</button></h1>
        <div class="stats">
            <div class="stat-card">
                <h3>Active Routes</h3>
                <div class="value" id="active-routes">0</div>
            </div>
            <div class="stat-card">
                <h3>Total Students</h3>
                <div class="value" id="total-students">0</div>
            </div>
            <div class="stat-card">
                <h3>Drivers Active</h3>
                <div class="value" id="drivers-active">0</div>
            </div>
        </div>
        <div class="gps-section">
            <h3>GPS Tracking</h3>
            <div id="gps-tracking">
                <p style="color: #666; text-align: center; padding: 20px;">Loading GPS tracking data...</p>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const errorDiv = document.getElementById('error-message');
            const successDiv = document.getElementById('success-message');
            
            loginBtn.textContent = 'Logging in...';
            loginBtn.disabled = true;
            errorDiv.style.display = 'none';
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        password: password,
                        businessName: 'tnt-gymnastics'
                    })
                });
                
                const data = await response.json();
                
                if (data.id) {
                    localStorage.setItem('routeRunnerAuth', JSON.stringify(data));
                    showDashboard();
                    loadDashboardData();
                } else {
                    errorDiv.textContent = data.message || 'Login failed';
                    errorDiv.style.display = 'block';
                }
                
            } catch (error) {
                console.error('Login error:', error);
                errorDiv.textContent = 'Network error. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                loginBtn.textContent = 'Login';
                loginBtn.disabled = false;
            }
        });
        
        function showDashboard() {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('dashboard').classList.add('active');
            document.body.style.padding = '0';
            document.body.style.background = '#f5f5f5';
        }
        
        function logout() {
            localStorage.removeItem('routeRunnerAuth');
            document.getElementById('login-container').style.display = 'block';
            document.getElementById('dashboard').classList.remove('active');
            document.body.style.padding = '20px';
            document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
        
        async function loadDashboardData() {
            try {
                const students = await fetch('/api/students').then(r => r.json()).catch(() => []);
                document.getElementById('total-students').textContent = students.length || 0;
                
                const sessions = await fetch('/api/pickup-sessions/today').then(r => r.json()).catch(() => []);
                const activeSessions = sessions.filter(s => s.status === 'in_progress');
                document.getElementById('active-routes').textContent = activeSessions.length || 0;
                
                const locations = await fetch('/api/driver-locations').then(r => r.json()).catch(() => []);
                document.getElementById('drivers-active').textContent = locations.length || 0;
                updateGpsTracking(locations);
                
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }
        
        function updateGpsTracking(locations) {
            const container = document.getElementById('gps-tracking');
            if (!locations || locations.length === 0) {
                container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No active drivers currently tracking</p>';
                return;
            }
            
            let html = '<div style="display: grid; gap: 12px;">';
            locations.forEach(location => {
                const driver = location.driver || {};
                const session = location.session || {};
                const route = session.route || {};
                
                html += \`
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f9fafb;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500; margin-bottom: 4px;">
                                    \${driver.firstName || 'Unknown'} \${driver.lastName || 'Driver'}
                                </div>
                                <div style="font-size: 14px; color: #666;">
                                    Route: \${route.name || 'Unknown Route'}
                                </div>
                                <div style="font-size: 12px; color: #888; margin-top: 4px;">
                                    Location: \${location.latitude?.substring(0, 7) || 'N/A'}, \${location.longitude?.substring(0, 7) || 'N/A'}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-left: auto; margin-bottom: 4px;"></div>
                                <div style="font-size: 12px; color: #666;">
                                    \${new Date(location.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            });
            html += '</div>';
            container.innerHTML = html;
        }
        
        // Check if already logged in
        const storedAuth = localStorage.getItem('routeRunnerAuth');
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                if (authData.id) {
                    showDashboard();
                    loadDashboardData();
                    setInterval(loadDashboardData, 30000); // Auto-refresh every 30 seconds
                }
            } catch (e) {
                localStorage.removeItem('routeRunnerAuth');
            }
        }
    </script>
</body>
</html>
    `;
    
*/
