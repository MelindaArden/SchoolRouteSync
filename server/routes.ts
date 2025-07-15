import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import "./types"; // Import session type declarations
import { createAuthToken, validateAuthToken, deleteAuthToken } from "./auth-tokens";
import { db, pool } from "./db";
import { pickupSessions, notifications, PickupSession, routeSchools, schools, masterAdmins, businesses, businessSubscriptions, userFeedback, systemErrors } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { 
  insertPickupSessionSchema, 
  insertStudentPickupSchema, 
  insertDriverLocationSchema,
  insertSchoolSchema,
  insertStudentSchema,
  insertUserSchema,
  insertRouteSchema,
  insertRouteSchoolSchema,
  insertRouteAssignmentSchema,
  insertIssueSchema
} from "@shared/schema";
import { z } from "zod";
import { geocodeAddress, validateCoordinates } from "./geocoding-service";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  businessName: z.string().min(1),
});

const updatePickupSchema = z.object({
  status: z.enum(["pending", "picked_up", "absent", "no_show"]),
  driverNotes: z.string().optional(),
  pickedUpAt: z.string().optional(),
});

const locationUpdateSchema = z.object({
  latitude: z.string(),
  longitude: z.string(),
  sessionId: z.number().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store WebSocket connections by user ID
  const connections = new Map<number, WebSocket>();
  
  wss.on('connection', (ws, request) => {
    console.log('WebSocket connection established');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth' && data.userId) {
          connections.set(data.userId, ws);
          console.log(`User ${data.userId} connected via WebSocket`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove connection from map
      connections.forEach((connection, userId) => {
        if (connection === ws) {
          connections.delete(userId);
          console.log(`User ${userId} disconnected from WebSocket`);
        }
      });
    });
  });

  // Broadcast function for real-time updates
  function broadcast(message: any, excludeUserId?: number) {
    const messageStr = JSON.stringify(message);
    connections.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN && userId !== excludeUserId) {
        ws.send(messageStr);
      }
    });
  }

  // Production deployment login endpoint with enhanced error handling
  app.post("/api/login", async (req, res) => {
    try {
      console.log('Production login attempt:', {
        body: req.body,
        headers: {
          userAgent: req.headers['user-agent'],
          origin: req.headers.origin,
          referer: req.headers.referer,
          host: req.headers.host
        },
        ip: req.ip,
        sessionId: req.sessionID,
        nodeEnv: process.env.NODE_ENV,
        replitDomain: process.env.REPLIT_DOMAIN
      });
      
      const { username, password, businessName } = loginSchema.parse(req.body);
      
      // Check database connection first
      try {
        const user = await storage.getUserByUsernameAndBusiness(username, businessName);
        console.log(`User lookup for "${username}":`, {
          userFound: !!user,
          hasPassword: user ? !!user.password : false,
          userRole: user?.role,
          userId: user?.id
        });
        
        if (!user || user.password !== password) {
          console.log(`Login failed for username "${username}":`, {
            userFound: !!user,
            passwordMatch: user ? user.password === password : false,
            userAgent: req.headers['user-agent']
          });
          
          return res.status(401).json({ 
            message: "Invalid username or password",
            debug: {
              userAgent: req.headers['user-agent'],
              isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || ''),
              timestamp: new Date().toISOString(),
              sessionId: req.sessionID,
              providedUsername: username,
              userFound: !!user,
              environment: process.env.NODE_ENV || 'development'
            }
          });
        }
        
        // Authentication successful - create both session and token for maximum compatibility

        // Create authentication token for deployment compatibility
        console.log(`Creating auth token for ${username}`);
        let authToken;
        try {
          authToken = createAuthToken(user.id, user.username, user.role);
          console.log(`Auth token created for ${username}: ${authToken.substring(0, 8)}...`);
        } catch (error) {
          console.error(`Token creation failed for ${username}:`, error);
          authToken = `fallback_${user.id}_${Date.now()}`;
        }
        
        // Create session for browsers that support it
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        // Force session save
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        console.log(`Login successful for ${username}:`, {
          userId: user.id,
          sessionId: req.sessionID,
          authToken: authToken.substring(0, 8) + '...',
          userAgent: req.headers['user-agent'],
          environment: process.env.NODE_ENV || 'development'
        });

        res.json({
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          authToken: authToken,
          debug: {
            tokenCreated: true,
            sessionCreated: true,
            sessionId: req.sessionID,
            userAgent: req.headers['user-agent'],
            isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || ''),
            loginMethod: 'production-deployment',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
          }
        });
        
      } catch (dbError) {
        console.error('Database error during login:', dbError);
        return res.status(500).json({
          message: "Database connection error",
          debug: {
            error: dbError.message,
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent']
          }
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ 
        message: "Invalid request data",
        error: error.message,
        debug: {
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // Enhanced session endpoint with mobile Safari compatibility and comprehensive token validation
  app.get("/api/session", async (req, res) => {
    try {
      // Check for authorization header first (mobile Safari compatibility)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('Session check with authorization header:', {
          tokenPrefix: token.substring(0, 8) + '...',
          userAgent: req.headers['user-agent']
        });
        
        try {
          const tokenData = validateAuthToken(token);
          if (tokenData) {
            console.log('Valid token found for user:', tokenData.username);
            return res.json({
              isAuthenticated: true,
              userId: tokenData.userId,
              username: tokenData.username,
              role: tokenData.role,
              debug: {
                authMethod: 'token',
                tokenValid: true,
                userAgent: req.headers['user-agent'],
                sessionId: req.sessionID
              }
            });
          }
        } catch (error) {
          console.log('Token validation failed:', error.message);
        }
      }
      
      // Fallback to session-based authentication  
      if (req.session && req.session.userId) {
        console.log('Session found for user:', req.session.username);
        return res.json({
          isAuthenticated: true,
          userId: req.session.userId,
          username: req.session.username,
          role: req.session.role,
          debug: {
            authMethod: 'session',
            sessionId: req.sessionID,
            userAgent: req.headers['user-agent']
          }
        });
      }
      
      console.log('No valid authentication found - session data:', {
        hasSession: !!req.session,
        sessionId: req.sessionID,
        sessionUserId: req.session?.userId,
        sessionUsername: req.session?.username,
        authHeader: !!authHeader,
        userAgent: req.headers['user-agent']
      });
      
      res.json({
        isAuthenticated: false,
        debug: {
          hasSession: !!req.session,
          hasAuthHeader: !!authHeader,
          sessionId: req.sessionID,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (error) {
      console.error('Session check error:', error);
      res.json({
        isAuthenticated: false,
        error: error.message,
        debug: {
          userAgent: req.headers['user-agent'],
          sessionId: req.sessionID
        }
      });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie('schoolbus.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Deployment connectivity and authentication test endpoint
  app.get("/api/deployment-test", async (req, res) => {
    console.log('Deployment connectivity test:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      replitDomain: process.env.REPLIT_DOMAIN
    });
    
    // Test database connection
    let dbConnected = false;
    let dbUsers = [];
    let testLoginResult = null;
    try {
      dbUsers = await storage.getAllUsers();
      dbConnected = true;
      
      // Test login with admin credentials
      if (dbUsers.length > 0) {
        const adminUser = dbUsers.find(u => u.username === 'ma1313');
        if (adminUser) {
          testLoginResult = {
            userFound: true,
            username: adminUser.username,
            role: adminUser.role,
            passwordSet: !!adminUser.password,
            expectedPassword: 'Dietdew13!'
          };
        }
      }
    } catch (dbError) {
      console.error('Database test failed:', dbError);
    }
    
    res.json({
      status: 'connected',
      message: 'Deployment connectivity successful',
      serverTime: new Date().toISOString(),
      clientIP: req.ip,
      userAgent: req.headers['user-agent'],
      isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || ''),
      environment: process.env.NODE_ENV || 'development',
      replitDomain: process.env.REPLIT_DOMAIN,
      database: {
        connected: dbConnected,
        userCount: dbUsers.length,
        availableUsers: dbUsers.map(u => ({ username: u.username, role: u.role, hasPassword: !!u.password }))
      },
      testLogin: testLoginResult,
      instructions: {
        loginEndpoint: '/api/login',
        testCredentials: {
          admin: { username: 'ma1313', password: 'Dietdew13!' },
          driver: { username: 'ChadW', password: 'Password123' }
        }
      },
      connection: 'established'
    });
  });

  // T-Mobile Safari diagnostic endpoint
  app.post("/api/tmobile-debug", async (req, res) => {
    console.log('T-Mobile Debug Request:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      ip: req.ip,
      sessionId: req.sessionID,
      cookies: req.headers.cookie
    });
    
    res.json({
      received: true,
      method: req.method,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString(),
      sessionId: req.sessionID
    });
  });

  // Enhanced mobile login endpoint with T-Mobile specific handling
  app.post("/api/mobile-login", async (req, res) => {
    try {
      console.log('Mobile login attempt:', {
        body: req.body,
        headers: {
          userAgent: req.headers['user-agent'],
          origin: req.headers.origin,
          referer: req.headers.referer,
          host: req.headers.host
        },
        ip: req.ip,
        sessionId: req.sessionID
      });
      
      const { username, password, businessName } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsernameAndBusiness(username, businessName);
      if (!user || user.password !== password) {
        console.log(`Mobile login failed for ${username}:`, {
          userFound: !!user,
          passwordMatch: user ? user.password === password : false,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(401).json({ 
          message: "Invalid credentials",
          debug: {
            userAgent: req.headers['user-agent'],
            isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || ''),
            isTMobile: req.headers['user-agent']?.includes('T-Mobile') || false,
            timestamp: new Date().toISOString(),
            sessionId: req.sessionID
          }
        });
      }

      // Create authentication token for mobile compatibility
      console.log(`Creating mobile auth token for ${username}`);
      let authToken;
      try {
        authToken = createAuthToken(user.id, user.username, user.role);
        console.log(`Mobile auth token created for ${username}: ${authToken.substring(0, 16)}...`);
      } catch (error) {
        console.error(`Mobile token creation failed for ${username}:`, error);
        authToken = `mobile_${user.id}_${Date.now()}`;
      }
      
      // Enhanced session creation for mobile
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      req.session.mobileToken = authToken;
      
      // Force session save for mobile browsers
      req.session.save((err) => {
        if (err) {
          console.error('Mobile session save error:', err);
        } else {
          console.log('Mobile session saved successfully');
        }
      });

      console.log(`Mobile login successful for ${username}:`, {
        userId: user.id,
        sessionId: req.sessionID,
        authToken: authToken.substring(0, 8) + '...',
        userAgent: req.headers['user-agent'],
        isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || '')
      });

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        authToken: authToken, // Mobile Safari will use this token
        token: authToken, // Backward compatibility
        debug: {
          tokenCreated: true,
          sessionCreated: true,
          sessionId: req.sessionID,
          userAgent: req.headers['user-agent'],
          isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || ''),
          loginMethod: 'mobile-enhanced',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Mobile login error:', error);
      res.status(400).json({ 
        message: "Invalid request data",
        error: error.message,
        debug: {
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // Get user profile
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user profile
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      const updatedUser = await storage.updateUser(userId, updates);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid user update data" });
    }
  });

  // Enhanced driver routes with complete student display and absence checking
  app.get("/api/drivers/:driverId/routes", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      console.log(`🚌 Fetching routes for driver ${driverId}`);
      
      const routes = await storage.getRoutesByDriver(driverId);
      console.log(`📋 Found ${routes.length} routes for driver ${driverId}`);
      
      const today = new Date().toISOString().split('T')[0];
      
      const detailedRoutes = await Promise.all(
        routes.map(async (route) => {
          console.log(`🔍 Processing route ${route.id}: ${route.name}`);
          
          const routeSchools = await storage.getRouteSchools(route.id);
          const assignments = await storage.getRouteAssignments(route.id);
          
          console.log(`🏫 Route ${route.id} has ${routeSchools.length} schools, ${assignments.length} assignments`);
          
          const schoolsWithStudents = await Promise.all(
            routeSchools.map(async (rs) => {
              const school = await storage.getSchool(rs.schoolId);
              
              // Get all students assigned to this school for this route
              const schoolAssignments = assignments.filter(a => a.schoolId === rs.schoolId);
              const schoolStudents = [];
              
              for (const assignment of schoolAssignments) {
                const student = await storage.getStudentById(assignment.studentId);
                if (student) {
                  // Check if student is absent today
                  const isAbsent = await storage.checkStudentAbsence(student.id, today);
                  schoolStudents.push({
                    ...student,
                    assignmentId: assignment.id,
                    isAbsent
                  });
                  console.log(`👨‍🎓 Student: ${student.firstName} ${student.lastName} - School: ${school?.name} - Absent: ${isAbsent}`);
                }
              }
              
              console.log(`✅ School ${school?.name}: ${schoolStudents.length} students`);
              
              return {
                ...rs,
                school,
                students: schoolStudents,
                studentCount: schoolStudents.length
              };
            })
          );
          
          // Sort schools by order index
          schoolsWithStudents.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
          
          const totalStudents = schoolsWithStudents.reduce((sum, school) => sum + school.students.length, 0);
          console.log(`📊 Route ${route.name} total students: ${totalStudents}`);
          
          return {
            ...route,
            schools: schoolsWithStudents,
            totalStudents
          };
        })
      );
      
      console.log(`🚀 Returning ${detailedRoutes.length} routes with complete student information`);
      res.json(detailedRoutes);
    } catch (error) {
      console.error('❌ Error fetching driver routes:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all route schools for assignment tracking
  app.get("/api/route-schools", async (req, res) => {
    try {
      const routeSchools = await storage.getRouteSchools(0); // Get all route schools
      // Actually get all route schools from all routes
      const allRoutes = await storage.getRoutes();
      const allRouteSchools = [];
      
      for (const route of allRoutes) {
        const schools = await storage.getRouteSchools(route.id);
        allRouteSchools.push(...schools);
      }
      
      res.json(allRouteSchools);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get route details with schools and students
  app.get("/api/routes/:routeId/details", async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      const routeSchools = await storage.getRouteSchools(routeId);
      const students = await storage.getStudentsByRoute(routeId);
      const assignments = await storage.getRouteAssignments(routeId);

      // Group students by school - FIX #6: ORDER BY DISMISSAL TIME AND EFFICIENCY
      const schoolsWithStudents = await Promise.all(
        routeSchools
          .sort((a, b) => a.orderIndex - b.orderIndex) // Primary sort by order index
          .map(async (rs) => {
            const school = await storage.getSchool(rs.schoolId);
            const schoolStudents = students.filter(s => 
              assignments.some(a => a.studentId === s.id && a.schoolId === rs.schoolId)
            );
            
            return {
              ...rs,
              school: {
                ...school,
                // Add efficiency sorting based on dismissal time
                dismissalMinutes: school?.dismissalTime ? 
                  parseInt(school.dismissalTime.split(':')[0]) * 60 + parseInt(school.dismissalTime.split(':')[1]) : 0
              },
              students: schoolStudents,
            };
          })
      );

      // ADDITIONAL SORT: Re-sort by dismissal time for optimal driver efficiency
      schoolsWithStudents.sort((a, b) => {
        // First by dismissal time (earliest first for efficient pickup sequence)
        const timeA = a.school?.dismissalMinutes || 0;
        const timeB = b.school?.dismissalMinutes || 0;
        if (timeA !== timeB) return timeA - timeB;
        
        // Then by order index as secondary sort
        return a.orderIndex - b.orderIndex;
      });

      res.json({
        ...route,
        schools: schoolsWithStudents,
        totalStudents: students.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create pickup session with enhanced student tracking and GPS
  app.post("/api/pickup-sessions", async (req, res) => {
    try {
      const sessionData = insertPickupSessionSchema.parse(req.body);
      const session = await storage.createPickupSession(sessionData);
      console.log('📝 Created pickup session:', session);
      
      // Create GPS route history entry when route starts
      if (req.body.startLatitude && req.body.startLongitude) {
        try {
          await storage.createGpsRouteHistory({
            sessionId: session.id,
            driverId: session.driverId,
            routeId: session.routeId,
            startLatitude: req.body.startLatitude,
            startLongitude: req.body.startLongitude,
            startTime: new Date()
          });
          console.log('📊 GPS route history started for session', session.id);
        } catch (gpsError) {
          console.error('⚠️ Failed to create GPS history:', gpsError);
          // Don't fail session start if GPS tracking fails
        }
      }
      
      // Create student pickup records for all students on the route
      const students = await storage.getStudentsByRoute(session.routeId);
      const assignments = await storage.getRouteAssignments(session.routeId);
      console.log(`👥 Found ${students.length} students and ${assignments.length} assignments for route ${session.routeId}`);
      
      for (const student of students) {
        const assignment = assignments.find(a => a.studentId === student.id);
        if (assignment) {
          const pickup = await storage.createStudentPickup({
            sessionId: session.id,
            studentId: student.id,
            schoolId: assignment.schoolId,
            status: "pending",
          });
          console.log('✅ Created pickup record for student:', student.firstName, student.lastName, pickup);
        }
      }

      broadcast({
        type: 'session_created',
        session,
        routeId: session.routeId,
        driverId: session.driverId
      });

      res.json(session);
    } catch (error) {
      console.error('Pickup session creation error:', error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  // Get today's sessions for driver
  app.get("/api/drivers/:driverId/sessions/today", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const today = new Date().toISOString().split('T')[0];
      const sessions = await storage.getSessionsByDriver(driverId, today);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all today's pickup sessions for admin dashboard
  app.get("/api/pickup-sessions/today", async (req, res) => {
    try {
      const sessions = await storage.getPickupSessionsToday();
      
      // Enrich sessions with driver, route, and pickup details with timeout protection
      const enrichedSessions = await Promise.allSettled(
        sessions.map(async (session) => {
          try {
            const [driver, route, studentPickups] = await Promise.allSettled([
              storage.getUser(session.driverId),
              storage.getRoute(session.routeId),
              storage.getStudentPickups(session.id)
            ]);
            
            return {
              ...session,
              driver: driver.status === 'fulfilled' ? driver.value : null,
              route: route.status === 'fulfilled' ? route.value : null,
              studentPickups: studentPickups.status === 'fulfilled' ? studentPickups.value : []
            };
          } catch (sessionError) {
            console.error(`Error enriching session ${session.id}:`, sessionError);
            return {
              ...session,
              driver: null,
              route: null,
              studentPickups: []
            };
          }
        })
      );
      
      const validSessions = enrichedSessions
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      res.json(validSessions);
    } catch (error) {
      console.error('Error fetching today\'s pickup sessions:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete all route schools for a route (used by optimizer)
  app.delete("/api/routes/:routeId/schools", async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      await storage.deleteRouteSchools(routeId);
      res.json({ message: "Route schools deleted successfully" });
    } catch (error) {
      console.error('Error deleting route schools:', error);
      res.status(500).json({ message: "Failed to delete route schools" });
    }
  });

  // Add a school to a route (used by optimizer)
  app.post("/api/routes/:routeId/schools", async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      
      if (isNaN(routeId)) {
        console.error('Invalid route ID:', req.params.routeId);
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      // Get current max order index for this route
      const existingSchools = await storage.getRouteSchools(routeId);
      const maxOrder = existingSchools.length > 0 ? Math.max(...existingSchools.map(s => s.orderIndex)) : 0;
      
      const routeSchoolData = {
        routeId,
        schoolId: req.body.schoolId,
        orderIndex: maxOrder + 1,
        estimatedArrivalTime: req.body.estimatedArrivalTime || "15:30",
        alertThresholdMinutes: req.body.alertThresholdMinutes || 10
      };
      
      console.log('Adding school to route:', routeSchoolData);
      const routeSchool = await storage.createRouteSchool(routeSchoolData);
      
      // CRITICAL FIX: Create route assignments for all students at this school
      const schoolStudents = await storage.getStudentsBySchool(routeSchoolData.schoolId);
      console.log(`👥 Creating assignments for ${schoolStudents.length} students at school ${routeSchoolData.schoolId}`);
      
      for (const student of schoolStudents) {
        try {
          await storage.createRouteAssignment({
            routeId: routeId,
            studentId: student.id,
            schoolId: routeSchoolData.schoolId,
            isActive: true
          });
          console.log(`✅ Created assignment: Route ${routeId} -> Student ${student.id} at School ${routeSchoolData.schoolId}`);
        } catch (assignmentError) {
          console.error(`Failed to create assignment for student ${student.id}:`, assignmentError);
        }
      }
      
      // Auto-optimize route order after adding new school
      await optimizeRouteOrder(routeId, storage);
      
      console.log(`🚌 Route ${routeId} automatically optimized for efficient pickup order`);
      
      // Broadcast route school addition and optimization to all connected clients
      broadcast({
        type: 'route_school_added',
        routeId,
        routeSchool,
        studentCount: schoolStudents.length,
        optimized: true
      });
      
      res.json({
        ...routeSchool,
        studentsAssigned: schoolStudents.length
      });
    } catch (error) {
      console.error('Error adding school to route:', error);
      res.status(500).json({ message: "Failed to add school to route", error: error.message });
    }
  });

  // Get session with pickup details
  app.get("/api/pickup-sessions/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getPickupSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const pickups = await storage.getStudentPickups(sessionId);
      
      // Get detailed pickup info with student and school data
      const detailedPickups = await Promise.all(
        pickups.map(async (pickup) => {
          const student = await storage.getStudentById(pickup.studentId);
          const school = await storage.getSchool(pickup.schoolId);
          return {
            ...pickup,
            student,
            school,
          };
        })
      );

      res.json({
        ...session,
        pickups: detailedPickups,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student pickups for a session
  app.get("/api/student-pickups", async (req, res) => {
    try {
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;
      
      if (sessionId) {
        const pickups = await storage.getStudentPickups(sessionId);
        
        // Get session details to check for absences
        const session = await storage.getPickupSession(sessionId);
        const sessionDate = session?.date || new Date().toISOString().split('T')[0];
        
        // Update pickup status if student is marked as absent
        const updatedPickups = await Promise.all(
          pickups.map(async (pickup) => {
            const isAbsent = await storage.checkStudentAbsence(pickup.studentId, sessionDate);
            return {
              ...pickup,
              status: isAbsent ? 'absent' : pickup.status
            };
          })
        );
        
        res.json(updatedPickups);
      } else {
        res.status(400).json({ message: "sessionId query parameter required" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get detailed student pickup information for GPS tracking
  app.get("/api/sessions/:sessionId/student-pickups-detailed", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const pickups = await storage.getStudentPickups(sessionId);
      
      // Get session details to get date for absence checking
      const session = await storage.getPickupSession(sessionId);
      const sessionDate = session?.date || new Date().toISOString().split('T')[0];
      
      // Get detailed pickup info with student and school data
      const detailedPickups = await Promise.all(
        pickups.map(async (pickup) => {
          const student = await storage.getStudentById(pickup.studentId);
          const school = await storage.getSchool(pickup.schoolId);
          
          // Check if student is marked as absent for this date
          const isAbsent = await storage.checkStudentAbsence(pickup.studentId, sessionDate);
          
          return {
            ...pickup,
            // Override status if student is marked as absent
            status: isAbsent ? 'absent' : pickup.status,
            student: student ? {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              grade: student.grade,
              phoneNumber: student.parentPhone || student.phoneNumber
            } : null,
            school: school ? {
              id: school.id,
              name: school.name,
              address: school.address
            } : null,
          };
        })
      );

      res.json(detailedPickups);
    } catch (error) {
      console.error('Error fetching detailed student pickups:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all student pickups for today
  app.get('/api/student-pickups/today', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todaysSessions = await storage.getPickupSessionsToday();
      
      let allPickups: any[] = [];
      for (const session of todaysSessions) {
        const pickups = await storage.getStudentPickups(session.id);
        allPickups = [...allPickups, ...pickups];
      }
      
      res.json(allPickups);
    } catch (error) {
      console.error('Error fetching today\'s student pickups:', error);
      res.status(500).json({ error: 'Failed to fetch today\'s student pickups' });
    }
  });

  // Update student pickup status
  app.patch("/api/student-pickups/:id", async (req, res) => {
    try {
      const pickupId = parseInt(req.params.id);
      console.log('Updating pickup:', { pickupId, body: req.body });
      
      const { status, driverNotes, pickedUpAt } = req.body;
      
      if (!['pending', 'picked_up', 'absent', 'no_show'].includes(status)) {
        console.error('Invalid status:', status);
        return res.status(400).json({ message: "Invalid pickup status" });
      }
      
      const updates: any = { status };
      
      if (driverNotes) {
        updates.driverNotes = driverNotes;
      }
      
      if (status === "picked_up" && pickedUpAt) {
        updates.pickedUpAt = new Date(pickedUpAt);
      } else if (status === "picked_up") {
        updates.pickedUpAt = new Date();
      } else if (status === "no_show" || status === "pending") {
        updates.pickedUpAt = null;
      }

      console.log('Applying updates:', updates);
      const pickup = await storage.updateStudentPickup(pickupId, updates);
      
      // Record GPS school arrival when student is picked up
      if (status === "picked_up" && req.body.sessionId && req.body.latitude && req.body.longitude) {
        try {
          const session = await storage.getPickupSession(req.body.sessionId);
          if (session) {
            await storage.createGpsRouteTrack({
              sessionId: req.body.sessionId,
              driverId: session.driverId,
              routeId: session.routeId,
              schoolId: pickup.schoolId,
              latitude: req.body.latitude,
              longitude: req.body.longitude,
              eventType: 'school_arrival'
            });
            console.log(`📍 GPS school arrival recorded: Driver ${session.driverId} at school ${pickup.schoolId}`);
          }
        } catch (gpsError) {
          console.error('⚠️ Failed to record GPS school arrival:', gpsError);
          // Don't fail the pickup update if GPS tracking fails
        }
      }
      
      broadcast({
        type: 'pickup_updated',
        pickup,
      });

      res.json(pickup);
    } catch (error) {
      console.error('Pickup update error:', error);
      res.status(400).json({ message: "Invalid pickup data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Complete route and save to history
  app.post("/api/pickup-sessions/:id/complete", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getPickupSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Calculate duration
      const completedTime = new Date();
      const startTime = session.startTime ? new Date(session.startTime) : completedTime;
      const durationMinutes = Math.round((completedTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      console.log(`🏁 Completing route session ${sessionId}, duration: ${durationMinutes} minutes`);
      
      // Update session status to completed
      await storage.updatePickupSession(sessionId, {
        status: 'completed',
        completedTime: completedTime,
        durationMinutes: durationMinutes
      });
      
      // Get student pickups for history
      const studentPickups = await storage.getStudentPickups(sessionId);
      const route = await storage.getRoute(session.routeId);
      const driver = await storage.getUser(session.driverId);
      
      // Save to pickup history
      const historyData = {
        sessionId: sessionId,
        routeId: session.routeId,
        driverId: session.driverId,
        routeName: route?.name || `Route ${session.routeId}`,
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown Driver',
        startTime: session.startTime,
        completedTime: completedTime,
        durationMinutes: durationMinutes,
        pickupDetails: JSON.stringify(studentPickups.map(pickup => ({
          studentId: pickup.studentId,
          status: pickup.status,
          pickupTime: pickup.pickupTime,
          notes: pickup.notes
        }))),
        totalStudents: studentPickups.length,
        studentsPickedUp: studentPickups.filter(p => p.status === 'picked_up').length,
        studentsAbsent: studentPickups.filter(p => p.status === 'absent').length,
        studentsNoShow: studentPickups.filter(p => p.status === 'no_show').length
      };
      
      await storage.createPickupHistory(historyData);
      
      // Broadcast route completion update
      broadcast({
        type: 'route_completed',
        sessionId: sessionId,
        routeId: session.routeId,
        driverId: session.driverId,
        completedTime: completedTime,
        durationMinutes: durationMinutes
      });
      
      console.log(`✅ Route ${sessionId} completed successfully and saved to history`);
      res.json({ 
        message: "Route completed successfully", 
        sessionId: sessionId,
        durationMinutes: durationMinutes,
        historyId: historyData
      });
    } catch (error) {
      console.error('Error completing route:', error);
      res.status(500).json({ message: "Failed to complete route" });
    }
  });

  // Test SMS endpoint using Twilio directly  
  app.post("/api/test-sms", async (req, res) => {
    try {
      const { sendTwilioSMS } = await import('./twilio-sms');
      // Simple message for T-Mobile compatibility
      const success = await sendTwilioSMS('+18593142300', 'AfterCare: Driver needs assistance');
      
      if (success) {
        res.json({ message: "T-Mobile friendly SMS sent via Twilio - check phone for delivery" });
      } else {
        res.status(500).json({ error: "Twilio SMS send failed" });
      }
    } catch (error) {
      console.error("SMS test failed:", error);
      res.status(500).json({ message: "SMS test failed", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Test AWS SNS SMS endpoint  
  app.post("/api/test-sns", async (req, res) => {
    try {
      const { sendSNSSMS } = await import('./aws-sns');
      const success = await sendSNSSMS('+18593142300', 'AfterCare via AWS SNS: Driver needs assistance');
      
      if (success) {
        res.json({ message: "SMS sent via AWS SNS - check phone for delivery" });
      } else {
        res.status(500).json({ error: "AWS SNS SMS send failed - check credentials" });
      }
    } catch (error) {
      console.error("AWS SNS test failed:", error);
      res.status(500).json({ message: "AWS SNS test failed", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Test email notification endpoint
  app.post("/api/test-email", async (req, res) => {
    try {
      const { sendAdminEmailNotification } = await import('./sendgrid-email');
      await sendAdminEmailNotification(
        'Test Van Maintenance Alert', 
        'This is a test email notification to verify the email system is working properly.',
        'medium'
      );
      res.json({ message: "Email notification sent - check your admin email" });
    } catch (error) {
      console.error("Email test failed:", error);
      res.status(500).json({ message: "Email test failed", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Update route school alert threshold
  app.patch("/api/route-schools/:id/alert-threshold", async (req, res) => {
    try {
      const routeSchoolId = parseInt(req.params.id);
      const { alertThresholdMinutes } = req.body;
      
      if (!alertThresholdMinutes || alertThresholdMinutes < 5 || alertThresholdMinutes > 60) {
        return res.status(400).json({ message: "Alert threshold must be between 5 and 60 minutes" });
      }

      await db.update(routeSchools)
        .set({ alertThresholdMinutes })
        .where(eq(routeSchools.id, routeSchoolId));
      
      res.json({ message: "Alert threshold updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update alert threshold" });
    }
  });

  // Get missed school alerts
  app.get("/api/missed-school-alerts", async (req, res) => {
    try {
      const alerts = await storage.getMissedSchoolAlerts();
      
      // Enrich with additional data
      const enrichedAlerts = await Promise.all(
        alerts.map(async (alert) => {
          const [driver, session] = await Promise.all([
            storage.getUser(alert.driverId),
            storage.getPickupSession(alert.sessionId)
          ]);
          
          let route = null;
          let routeSchool = null;
          
          if (session) {
            route = await storage.getRoute(session.routeId);
          }
          
          if (alert.routeSchoolId) {
            const routeSchools = await storage.getRouteSchools(session?.routeId || 0);
            routeSchool = routeSchools.find(rs => rs.id === alert.routeSchoolId);
            
            if (routeSchool) {
              const school = await storage.getSchool(routeSchool.schoolId);
              routeSchool = { ...routeSchool, school };
            }
          }
          
          return {
            ...alert,
            driver,
            session,
            route,
            routeSchool
          };
        })
      );
      
      res.json(enrichedAlerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch missed school alerts" });
    }
  });

  // Get pickup history for admin dashboard
  app.get("/api/pickup-history", async (req, res) => {
    try {
      const history = await storage.getPickupHistory();
      
      // Get detailed history with driver, route, and pickup details
      const detailedHistory = await Promise.all(
        history.map(async (record) => {
          const [driver, route] = await Promise.all([
            storage.getUser(record.driverId),
            storage.getRoute(record.routeId)
          ]);
          
          let pickupDetails = [];
          if (record.pickupDetails) {
            try {
              pickupDetails = JSON.parse(record.pickupDetails);
            } catch (e) {
              console.error('Error parsing pickup details:', e);
            }
          }
          
          return {
            ...record,
            driver,
            route,
            pickupDetails
          };
        })
      );
      
      res.json(detailedHistory);
    } catch (error) {
      console.error('Error fetching pickup history:', error);
      res.status(500).json({ message: "Failed to fetch pickup history" });
    }
  });

  // Get pickup history for specific driver
  app.get("/api/drivers/:driverId/pickup-history", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const history = await storage.getPickupHistoryByDriver(driverId);
      
      const detailedHistory = await Promise.all(
        history.map(async (record) => {
          const route = await storage.getRoute(record.routeId);
          
          let pickupDetails = [];
          if (record.pickupDetails) {
            try {
              pickupDetails = JSON.parse(record.pickupDetails);
            } catch (e) {
              console.error('Error parsing pickup details:', e);
            }
          }
          
          return {
            ...record,
            route,
            pickupDetails
          };
        })
      );
      
      res.json(detailedHistory);
    } catch (error) {
      console.error('Error fetching driver pickup history:', error);
      res.status(500).json({ message: "Failed to fetch driver pickup history" });
    }
  });

  // Admin: Mark route as complete (when driver forgets)
  app.post("/api/admin/routes/:sessionId/complete", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { adminId, notes } = req.body;
      
      const session = await storage.getPickupSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.status === "completed") {
        return res.status(400).json({ message: "Route is already completed" });
      }
      
      // Mark session as complete
      await storage.updatePickupSession(sessionId, {
        status: "completed",
        completedTime: new Date()
      });
      
      // Get student pickups for this session
      const studentPickups = await storage.getStudentPickups(sessionId);
      
      // Mark any pending students as "no_show" if they weren't picked up
      for (const pickup of studentPickups) {
        if (pickup.status === "pending") {
          await storage.updateStudentPickup(pickup.id, {
            status: "no_show",
            pickedUpAt: new Date(),
            driverNotes: "Marked by admin - route completed"
          });
        }
      }
      
      // Create pickup history record
      const route = await storage.getRoute(session.routeId);
      const driver = await storage.getUser(session.driverId);
      
      const pickupDetails = studentPickups.map(pickup => ({
        studentId: pickup.studentId,
        status: pickup.status,
        pickedUpAt: pickup.pickedUpAt,
        driverNotes: pickup.driverNotes
      }));
      
      await storage.createPickupHistory({
        sessionId: session.id,
        routeId: session.routeId,
        driverId: session.driverId,
        date: new Date().toISOString().split('T')[0],
        completedAt: new Date(),
        totalStudents: studentPickups.length,
        studentsPickedUp: studentPickups.filter(p => p.status === 'picked_up').length,
        pickupDetails: JSON.stringify(pickupDetails),
        notes: `Route completed by admin. ${notes || ''}`
      });
      
      // Broadcast update via WebSocket
      broadcast({
        type: 'route_completed',
        sessionId: session.id,
        routeId: session.routeId,
        driverId: session.driverId,
        completedBy: 'admin'
      });
      
      res.json({ message: "Route marked as complete successfully" });
    } catch (error) {
      console.error('Admin route completion error:', error);
      res.status(500).json({ message: "Failed to complete route" });
    }
  });
  
  // Admin: Mark student absent for specific pickup time
  app.post("/api/admin/students/:studentId/absent", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const { sessionId, adminId, reason, date } = req.body;
      
      const student = await storage.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // If sessionId provided, mark absent for that specific session
      if (sessionId) {
        const existingPickup = await storage.getStudentPickups(sessionId);
        const studentPickup = existingPickup.find(p => p.studentId === studentId);
        
        if (studentPickup) {
          await storage.updateStudentPickup(studentPickup.id, {
            status: "absent",
            pickedUpAt: new Date(),
            driverNotes: `Marked absent by admin: ${reason || 'No reason provided'}`
          });
        } else {
          // Create new pickup record as absent
          await storage.createStudentPickup({
            sessionId,
            studentId,
            schoolId: student.schoolId,
            status: "absent",
            driverNotes: `Marked absent by admin: ${reason || 'No reason provided'}`
          });
        }
        
        // Broadcast update
        broadcast({
          type: 'student_status_updated',
          studentId,
          sessionId,
          status: 'absent',
          updatedBy: 'admin'
        });
      }
      
      res.json({ message: "Student marked as absent successfully" });
    } catch (error) {
      console.error('Admin mark absent error:', error);
      res.status(500).json({ message: "Failed to mark student absent" });
    }
  });

  // Helper function to calculate distance between two points
  // Helper function to optimize route order based on dismissal times and distances
  async function optimizeRouteOrder(routeId: number, storage: any) {
    try {
      console.log(`🔄 Auto-optimizing route ${routeId}...`);
      
      // Get all schools in this route
      const routeSchoolsData = await storage.getRouteSchools(routeId);
      
      if (routeSchoolsData.length <= 1) {
        console.log('Route has 1 or fewer schools, no optimization needed');
        return;
      }
      
      // Get school details with coordinates and dismissal times
      const schoolsWithDetails = await Promise.all(
        routeSchoolsData.map(async (rs: any) => {
          const school = await storage.getSchool(rs.schoolId);
          return {
            ...rs,
            school,
            lat: parseFloat(school.latitude || '0'),
            lng: parseFloat(school.longitude || '0'),
            dismissalTime: school.dismissalTime
          };
        })
      );
      
      // Sort by dismissal time first (earliest dismissal times first for pickup efficiency)
      schoolsWithDetails.sort((a, b) => {
        const timeA = a.dismissalTime || '15:30';
        const timeB = b.dismissalTime || '15:30';
        return timeA.localeCompare(timeB);
      });
      
      // Update order indices based on optimized order
      for (let i = 0; i < schoolsWithDetails.length; i++) {
        const routeSchool = schoolsWithDetails[i];
        await db.update(routeSchools)
          .set({ 
            orderIndex: i + 1,
            estimatedArrivalTime: calculateEstimatedArrival(routeSchool.dismissalTime)
          })
          .where(eq(routeSchools.id, routeSchool.id));
      }
      
      console.log(`✅ Route ${routeId} optimized with ${schoolsWithDetails.length} schools`);
      
    } catch (error) {
      console.error('Error optimizing route order:', error);
    }
  }
  
  // Calculate estimated arrival time (5 minutes before dismissal)
  function calculateEstimatedArrival(dismissalTime: string): string {
    try {
      const [hours, minutes] = dismissalTime.split(':').map(Number);
      const dismissalMinutes = hours * 60 + minutes;
      const arrivalMinutes = Math.max(0, dismissalMinutes - 5); // 5 minutes before dismissal
      
      const arrivalHours = Math.floor(arrivalMinutes / 60);
      const arrivalMins = arrivalMinutes % 60;
      
      return `${arrivalHours.toString().padStart(2, '0')}:${arrivalMins.toString().padStart(2, '0')}`;
    } catch (error) {
      return dismissalTime; // Fallback to dismissal time
    }
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Helper function to check proximity alerts
  async function checkProximityAlerts(sessionId: number, driverLocation: any) {
    try {
      const session = await storage.getPickupSession(sessionId);
      if (!session || session.status !== "in_progress") return;

      const driver = await storage.getUser(session.driverId);
      const route = await storage.getRoute(session.routeId);
      if (!route) return;

      const routeSchools = await storage.getRouteSchools(route.id);
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      for (const routeSchool of routeSchools) {
        const school = await storage.getSchool(routeSchool.schoolId);
        if (!school?.latitude || !school?.longitude) continue;

        const schoolLat = parseFloat(school.latitude);
        const schoolLon = parseFloat(school.longitude);
        const driverLat = parseFloat(driverLocation.latitude);
        const driverLon = parseFloat(driverLocation.longitude);

        const distance = calculateDistance(driverLat, driverLon, schoolLat, schoolLon);
        
        // Parse dismissal time
        const dismissalTime = new Date(`1970-01-01T${school.dismissalTime}:00`);
        const currentTimeDate = new Date(`1970-01-01T${currentTime}:00`);
        const timeUntilDismissal = (dismissalTime.getTime() - currentTimeDate.getTime()) / (1000 * 60); // minutes

        // Send alert if driver is more than 2 miles away and less than 10 minutes until dismissal
        if (distance > 2 && timeUntilDismissal <= 10 && timeUntilDismissal > 0) {
          // Get admin users
          const users = await storage.getUsers();
          const adminUsers = users.filter(u => u.role === "leadership");
          
          // Create notifications for admins
          for (const admin of adminUsers) {
            await storage.createNotification({
              type: "proximity_alert",
              title: "Driver Proximity Warning",
              message: `${driver?.firstName} ${driver?.lastName} is ${distance.toFixed(1)} miles from ${school.name}. Dismissal in ${Math.round(timeUntilDismissal)} minutes.`,
              recipientId: admin.id,
              sessionId: session.id,
            });
          }

          // Send SMS alerts to admins via GoHighLevel
          try {
            const { sendAdminNotifications } = await import('./notification-service');
            await sendAdminNotifications({
              type: 'proximity',
              title: 'Driver Proximity Alert',
              message: `Driver ${driver?.firstName} ${driver?.lastName} is ${distance.toFixed(1)} miles from ${school.name}. Dismissal: ${school.dismissalTime} (${Math.round(timeUntilDismissal)} min). Driver may be late for pickup.`,
              driverId: session.driverId,
              sessionId: session.id,
              priority: 'high'
            });
          } catch (error) {
            console.error('Failed to send proximity alert notifications:', error);
          }

          // Broadcast proximity alert
          broadcast({
            type: 'proximity_alert',
            alert: {
              driverId: session.driverId,
              sessionId: session.id,
              schoolId: school.id,
              distance: distance.toFixed(1),
              timeUntilDismissal: Math.round(timeUntilDismissal),
              message: `${driver?.firstName} ${driver?.lastName} is ${distance.toFixed(1)} miles from ${school.name}`
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking proximity alerts:', error);
    }
  }

  // Enhanced mobile-friendly GPS tracking endpoint
  app.post("/api/drivers/:driverId/location", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const { latitude, longitude, sessionId, speed, bearing, accuracy } = locationUpdateSchema.parse(req.body);
      
      const timestamp = new Date();
      console.log(`📍 Enhanced GPS update for driver ${driverId}: ${latitude}, ${longitude}`, {
        speed,
        bearing,
        accuracy,
        sessionId,
        timestamp: timestamp.toISOString()
      });
      
      const location = await storage.updateDriverLocation({
        driverId,
        latitude,
        longitude,
        sessionId,
      });

      // Enhanced GPS route tracking for comprehensive history
      if (sessionId) {
        try {
          const session = await storage.getPickupSession(sessionId);
          if (session && session.status === 'in_progress') {
            // Create detailed GPS route track entry
            await storage.createGpsRouteTrack({
              sessionId: sessionId,
              driverId: driverId,
              routeId: session.routeId,
              latitude: latitude,
              longitude: longitude,
              speed: speed || null,
              bearing: bearing || null,
              accuracy: accuracy || null,
              eventType: 'location_update',
              timestamp: timestamp
            });
            
            // Initialize or update GPS route history for this session
            const existingHistory = await storage.getGpsRouteHistoryBySession(sessionId);
            if (!existingHistory) {
              const route = await storage.getRoute(session.routeId);
              await storage.createGpsRouteHistory({
                sessionId: sessionId,
                driverId: driverId,
                routeId: session.routeId,
                routeName: route?.name || `Route ${session.routeId}`,
                startTime: session.startTime || timestamp,
                routePath: {
                  coordinates: [{ lat: parseFloat(latitude), lng: parseFloat(longitude), timestamp: timestamp.toISOString(), speed: speed || undefined }],
                  schoolTimestamps: []
                }
              });
            } else {
              // Update existing route history with new GPS point
              const currentPath = existingHistory.routePath || { coordinates: [], schoolTimestamps: [] };
              currentPath.coordinates.push({ 
                lat: parseFloat(latitude), 
                lng: parseFloat(longitude), 
                timestamp: timestamp.toISOString(), 
                speed: speed || undefined 
              });
              
              await storage.updateGpsRouteHistory(existingHistory.id, {
                routePath: currentPath
              });
            }
            
            console.log('📊 Comprehensive GPS route tracking recorded for session', sessionId);
          }
        } catch (trackError) {
          console.error('⚠️ Failed to record GPS track:', trackError);
          // Don't fail the location update if GPS tracking fails
        }
      }

      // Check for proximity alerts if session is active
      if (sessionId) {
        await checkProximityAlerts(sessionId, location);
      }

      broadcast({
        type: 'location_updated',
        driverId,
        location,
        timestamp: timestamp.toISOString(),
        gpsTracked: !!sessionId
      }, driverId);

      res.json({
        ...location,
        timestamp: timestamp.toISOString(),
        gpsTracked: !!sessionId
      });
    } catch (error) {
      console.error("Enhanced GPS tracking error:", error);
      res.status(400).json({ message: "Invalid location data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get all driver locations
  app.get("/api/driver-locations", async (req, res) => {
    try {
      // Set timeout for database queries
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 8000);
      });
      
      const locationsPromise = storage.getDriverLocations();
      const locations = await Promise.race([locationsPromise, timeoutPromise]);
      
      // Enrich with driver and session information using Promise.allSettled for error tolerance
      const enrichedLocations = await Promise.allSettled(
        locations.map(async (location) => {
          try {
            const [driverResult, sessionResult] = await Promise.allSettled([
              storage.getUser(location.driverId),
              location.sessionId ? storage.getPickupSession(location.sessionId) : Promise.resolve(null)
            ]);
            
            const driver = driverResult.status === 'fulfilled' ? driverResult.value : null;
            let session = sessionResult.status === 'fulfilled' ? sessionResult.value : null;
            
            if (session) {
              try {
                const route = await storage.getRoute(session.routeId);
                session = { ...session, route };
              } catch (routeError) {
                console.error('Error fetching route for session:', routeError);
              }
            }
            
            return {
              ...location,
              driver,
              session,
            };
          } catch (locationError) {
            console.error(`Error enriching location ${location.id}:`, locationError);
            return {
              ...location,
              driver: null,
              session: null,
            };
          }
        })
      );
      
      const validLocations = enrichedLocations
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      res.json(validLocations);
    } catch (error) {
      console.error('Error fetching driver locations:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get specific driver location
  app.get("/api/drivers/:driverId/location", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const location = await storage.getDriverLocation(driverId);
      
      if (!location) {
        return res.status(404).json({ message: "Driver location not found" });
      }
      
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get GPS route tracks for a session with school details
  app.get("/api/gps/sessions/:sessionId/tracks", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const tracks = await storage.getGpsRouteTracksBySession(sessionId);
      
      // Enrich tracks with school information
      const enrichedTracks = await Promise.all(
        tracks.map(async (track) => {
          if (track.schoolId) {
            const school = await storage.getSchool(track.schoolId);
            return { ...track, school };
          }
          return { ...track, school: null };
        })
      );
      
      res.json(enrichedTracks);
    } catch (error) {
      console.error('Error fetching GPS tracks:', error);
      res.status(500).json({ message: "Failed to fetch GPS tracks" });
    }
  });

  // Get GPS route history for last 30 days
  app.get("/api/gps/route-history", async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const history = await storage.getGpsRouteHistory();
      
      // Filter for last 30 days and enrich with driver information and actual student counts
      const enrichedHistory = await Promise.all(
        history
          .filter(route => new Date(route.createdAt) >= thirtyDaysAgo)
          .map(async (route) => {
            const driver = await storage.getUser(route.driverId);
            
            // Get actual student pickup data for this session
            const studentPickups = await storage.getStudentPickups(route.sessionId);
            const pickedUpCount = studentPickups.filter(p => p.status === 'picked_up').length;
            const totalStudents = studentPickups.length;
            
            // Get actual school count for this route
            const routeSchools = await storage.getRouteSchools(route.routeId);
            const schoolsCount = routeSchools.length;
            
            return { 
              ...route, 
              driver,
              // Override with accurate counts
              totalStudentsPickedUp: pickedUpCount,
              schoolsVisited: schoolsCount,
              // Add total students for pickup detail display
              totalStudentsOnRoute: totalStudents
            };
          })
      );
      
      // Sort by creation date (newest first)
      const sortedHistory = enrichedHistory.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json(sortedHistory);
    } catch (error) {
      console.error('Error fetching GPS route history:', error);
      res.status(500).json({ message: "Failed to fetch GPS route history" });
    }
  });

  // Get GPS tracks for a specific driver
  app.get("/api/gps/drivers/:driverId/tracks", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const tracks = await storage.getGpsRouteTracksByDriver(driverId);
      
      // Enrich tracks with session and school information
      const enrichedTracks = await Promise.all(
        tracks.map(async (track) => {
          const session = await storage.getPickupSession(track.sessionId);
          const school = track.schoolId ? await storage.getSchool(track.schoolId) : null;
          
          return { 
            ...track, 
            session: session ? {
              ...session,
              route: await storage.getRoute(session.routeId)
            } : null,
            school
          };
        })
      );
      
      res.json(enrichedTracks);
    } catch (error) {
      console.error('Error fetching driver GPS tracks:', error);
      res.status(500).json({ message: "Failed to fetch driver GPS tracks" });
    }
  });

  // Get all active sessions (for leadership dashboard)
  app.get("/api/pickup-sessions/today", (req, res) => {
    res.json([]);
  });

  // Get driver locations
  app.get("/api/driver-locations", async (req, res) => {
    try {
      // Get all current driver locations
      const sessions = await storage.getTodaysSessions();
      const activeDriverIds = sessions
        .filter(s => s.status === "in_progress")
        .map(s => s.driverId);
      
      const locations = await Promise.all(
        activeDriverIds.map(async (driverId) => {
          return await storage.getDriverLocation(driverId);
        })
      );
      
      res.json(locations.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get notifications for user
  app.get("/api/users/:userId/notifications", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      // Add delete method to storage
      await db.delete(notifications).where(eq(notifications.id, notificationId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark all notifications as read for user
  app.patch("/api/users/:userId/notifications/mark-all-read", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientId, userId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Issues routes
  app.get("/api/issues", async (req, res) => {
    try {
      const issues = await storage.getIssues();
      
      // Enrich with driver information
      const enrichedIssues = await Promise.all(
        issues.map(async (issue) => {
          const driver = await storage.getUser(issue.driverId);
          return {
            ...issue,
            driver,
          };
        })
      );
      
      res.json(enrichedIssues);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/drivers/:driverId/issues", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const issues = await storage.getIssuesByDriver(driverId);
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/issues", async (req, res) => {
    try {
      const issueData = insertIssueSchema.parse(req.body);
      const issue = await storage.createIssue(issueData);

      // Get driver information for the notification
      const driver = await storage.getUser(issue.driverId);

      // Create notifications for all admin users
      const users = await storage.getUsers();
      const adminUsers = users.filter(u => u.role === "leadership");
      
      for (const admin of adminUsers) {
        await storage.createNotification({
          type: issueData.type === "maintenance" ? "van_maintenance" : "driver_issue",
          title: issueData.type === "maintenance" ? "Van Maintenance Request" : "Driver Issue Report",
          message: `${issueData.title} - Priority: ${issueData.priority}`,
          recipientId: admin.id,
        });
      }

      // Send SMS notifications to admins via Twilio
      try {
        const { sendAdminNotifications } = await import('./notification-service');
        await sendAdminNotifications({
          type: issueData.type as 'issue' | 'maintenance',
          title: issueData.type === "maintenance" ? "Van Maintenance Request" : "Driver Issue Report",
          message: `Driver: ${driver?.firstName} ${driver?.lastName}\nIssue: ${issueData.title}\nPriority: ${issueData.priority?.toUpperCase()}\nDescription: ${issueData.description}`,
          driverId: issueData.driverId,
          priority: (issueData.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
          timezone: 'America/New_York' // Default to Eastern Time for US school operations
        });
      } catch (smsError) {
        console.error('Failed to send SMS notifications:', smsError);
      }

      // Broadcast to connected admin clients
      broadcast({
        type: 'issue_created',
        issue: {
          ...issue,
          driver,
        },
      });

      res.json(issue);
    } catch (error) {
      res.status(400).json({ message: "Invalid issue data" });
    }
  });

  app.patch("/api/issues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const issue = await storage.updateIssue(id, updates);
      
      broadcast({
        type: 'issue_updated',
        issue,
      });

      res.json(issue);
    } catch (error) {
      res.status(400).json({ message: "Invalid issue update data" });
    }
  });

  // Get schools
  app.get("/api/schools", async (req, res) => {
    try {
      const schools = await storage.getSchools();
      res.json(schools);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create school
  app.post("/api/schools", async (req, res) => {
    try {
      console.log('Creating school with data:', req.body);
      
      // Create a custom schema for school validation that handles decimal fields
      const schoolValidationSchema = z.object({
        name: z.string().min(1, "School name is required"),
        address: z.string().min(1, "Address is required"),
        dismissalTime: z.string().min(1, "Dismissal time is required"),
        contactPhone: z.string().optional(),
        latitude: z.union([z.string(), z.number(), z.null()]).optional(),
        longitude: z.union([z.string(), z.number(), z.null()]).optional(),
        isActive: z.boolean().optional(),
      });
      
      // Validate the input
      const validatedData = schoolValidationSchema.parse(req.body);
      
      // Auto-geocode address if coordinates are not provided
      let latitude = validatedData.latitude ? String(validatedData.latitude) : null;
      let longitude = validatedData.longitude ? String(validatedData.longitude) : null;
      
      if ((!latitude || !longitude) && validatedData.address) {
        console.log('🗺️ Attempting to geocode address automatically...');
        const geocodeResult = await geocodeAddress(validatedData.address);
        if (geocodeResult) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
          console.log(`✅ Auto-geocoding successful: ${latitude}, ${longitude}`);
        } else {
          console.log('⚠️ Auto-geocoding failed, coordinates will be null');
        }
      }
      
      // Transform to match database requirements
      const schoolData = {
        name: validatedData.name,
        address: validatedData.address,
        dismissalTime: validatedData.dismissalTime,
        contactPhone: validatedData.contactPhone || null,
        latitude,
        longitude,
        isActive: validatedData.isActive ?? true,
      };
      
      console.log('Transformed school data:', schoolData);
      
      // Direct database insertion bypassing strict schema
      const [school] = await db.insert(schools).values(schoolData).returning();
      res.json(school);
    } catch (error) {
      console.error('School creation error:', error);
      res.status(400).json({ message: "Invalid school data", error: error.message });
    }
  });

  // Geocode address endpoint
  app.post("/api/geocode", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ message: "Address is required" });
      }
      
      console.log(`🗺️ Geocoding request for: ${address}`);
      const result = await geocodeAddress(address);
      
      if (result) {
        console.log(`✅ Geocoding successful: ${result.latitude}, ${result.longitude}`);
        res.json({
          success: true,
          latitude: result.latitude,
          longitude: result.longitude,
          formatted_address: result.formatted_address
        });
      } else {
        console.log(`❌ Geocoding failed for: ${address}`);
        res.status(404).json({
          success: false,
          message: "Could not geocode address. Please check the address and try again."
        });
      }
    } catch (error) {
      console.error('Geocoding endpoint error:', error);
      res.status(500).json({
        success: false,
        message: "Geocoding service error"
      });
    }
  });

  app.patch("/api/schools/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const school = await storage.updateSchool(id, updates);
      res.json(school);
    } catch (error) {
      res.status(400).json({ message: "Invalid school data" });
    }
  });

  app.delete("/api/schools/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSchool(id);
      res.json({ message: "School deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete school" });
    }
  });

  // Update school
  app.patch("/api/schools/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const school = await storage.updateSchool(id, updates);
      res.json(school);
    } catch (error) {
      res.status(400).json({ message: "Invalid school update data" });
    }
  });

  // Get all students
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create student
  app.post("/api/students", async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      res.json(student);
    } catch (error) {
      res.status(400).json({ message: "Invalid student data" });
    }
  });

  app.patch("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const student = await storage.updateStudent(id, updates);
      res.json(student);
    } catch (error) {
      res.status(400).json({ message: "Invalid student data" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStudent(id);
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete student" });
    }
  });

  // Update student
  app.patch("/api/students/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const student = await storage.updateStudent(id, updates);
      res.json(student);
    } catch (error) {
      res.status(400).json({ message: "Invalid student update data" });
    }
  });

  // Get all users (drivers and leadership)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map((user: any) => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create user (driver or leadership)
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Update user
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user update data" });
    }
  });

  // Get all routes
  app.get("/api/routes", async (req, res) => {
    try {
      const routes = await storage.getRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get routes with assigned schools
  app.get("/api/routes/with-schools", async (req, res) => {
    try {
      const routes = await storage.getRoutes();
      const routesWithSchools = await Promise.all(
        routes.map(async (route) => {
          const routeSchools = await storage.getRouteSchools(route.id);
          const schoolsWithDetails = await Promise.all(
            routeSchools.map(async (rs) => ({
              ...rs,
              school: await storage.getSchool(rs.schoolId)
            }))
          );
          return { ...route, schools: schoolsWithDetails };
        })
      );
      res.json(routesWithSchools);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create route with enhanced error handling and logging
  app.post("/api/routes", async (req, res) => {
    try {
      const routeData = insertRouteSchema.parse(req.body);
      console.log('Creating route with data:', routeData);
      
      const route = await storage.createRoute(routeData);
      console.log('✅ Route created successfully with ID:', route.id);
      
      // Broadcast route creation to all connected clients
      broadcast({
        type: 'route_created',
        route,
      });
      
      // Ensure route ID is properly returned
      res.json({
        id: route.id,
        ...route
      });
    } catch (error) {
      console.error('❌ Route creation error:', error);
      res.status(400).json({ 
        message: "Invalid route data", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update route
  app.patch("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const updates = req.body;
      const route = await storage.updateRoute(routeId, updates);
      
      // Broadcast route update to all connected clients
      broadcast({
        type: 'route_updated',
        route,
      });
      
      res.json(route);
    } catch (error) {
      console.error('Route update error:', error);
      res.status(400).json({ message: "Failed to update route" });
    }
  });

  // Delete route
  app.delete("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      
      // First delete associated route schools
      await storage.deleteRouteSchools(routeId);
      
      // Then delete the route
      await storage.deleteRoute(routeId);
      
      // Broadcast route deletion to all connected clients
      broadcast({
        type: 'route_deleted',
        routeId,
      });
      
      res.json({ message: "Route deleted successfully" });
    } catch (error) {
      console.error('Route deletion error:', error);
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  // Delete route schools
  app.delete("/api/routes/:routeId/schools", async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      await storage.deleteRouteSchools(routeId);
      res.json({ message: "Route schools deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete route schools" });
    }
  });

  // Add school to route
  app.post("/api/routes/:routeId/schools", async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      const routeSchoolData = insertRouteSchoolSchema.parse({
        routeId,
        ...req.body
      });
      const routeSchool = await storage.createRouteSchool(routeSchoolData);
      res.json(routeSchool);
    } catch (error) {
      res.status(400).json({ message: "Invalid route school data" });
    }
  });

  // Assign student to route
  app.post("/api/routes/:routeId/students", async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      const assignmentData = insertRouteAssignmentSchema.parse({
        routeId,
        ...req.body
      });
      const assignment = await storage.createRouteAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Invalid route assignment data" });
    }
  });

  // Student Absence Management Routes
  app.get('/api/student-absences', async (req, res) => {
    try {
      const absences = await storage.getStudentAbsences();
      res.json(absences);
    } catch (error) {
      console.error('Error fetching student absences:', error);
      res.status(500).json({ message: "Failed to fetch student absences" });
    }
  });

  // Get current date endpoint
  app.get('/api/student-absences/date', async (req, res) => {
    try {
      // Return today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      console.log('Current date API called, returning:', todayStr);
      res.json({ date: todayStr });
    } catch (error) {
      console.error('Error getting current date:', error);
      res.status(500).json({ message: "Failed to get current date" });
    }
  });

  app.get('/api/student-absences/date/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const absences = await storage.getStudentAbsencesByDate(date);
      res.json(absences);
    } catch (error) {
      console.error('Error fetching student absences by date:', error);
      res.status(500).json({ message: "Failed to fetch student absences" });
    }
  });

  app.get('/api/students/:studentId/absences', async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const absences = await storage.getStudentAbsencesByStudent(studentId);
      res.json(absences);
    } catch (error) {
      console.error('Error fetching student absences:', error);
      res.status(500).json({ message: "Failed to fetch student absences" });
    }
  });

  app.post('/api/student-absences', async (req, res) => {
    try {
      // Enhanced absence creation with proper session management
      const sessionData = req.session as any;
      const markedBy = sessionData?.userId || 3; // Use session user or default admin
      
      console.log('Creating student absence with user:', markedBy, 'Data:', req.body);

      // Transform the request data to match database schema
      const absenceData = {
        studentId: parseInt(req.body.studentId),
        absenceDate: req.body.absenceDate,
        reason: req.body.reason || null,
        notes: req.body.notes || null,
        markedBy
      };
      
      console.log('Transformed absence data:', absenceData);
      const absence = await storage.createStudentAbsence(absenceData);
      
      // Broadcast absence creation to all connected clients
      broadcast({
        type: 'absence_created',
        absence,
        studentId: absence.studentId,
        date: absence.absenceDate
      });
      
      console.log('Successfully created absence:', absence);
      res.status(201).json(absence);
    } catch (error) {
      console.error('Error creating student absence:', error);
      res.status(500).json({ 
        message: "Failed to create student absence",
        error: error.message 
      });
    }
  });

  app.delete('/api/student-absences/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStudentAbsence(id);
      res.json({ message: "Student absence deleted successfully" });
    } catch (error) {
      console.error('Error deleting student absence:', error);
      res.status(500).json({ message: "Failed to delete student absence" });
    }
  });

  app.get('/api/students/:studentId/absence-check/:date', async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const { date } = req.params;
      const isAbsent = await storage.checkStudentAbsence(studentId, date);
      res.json({ isAbsent });
    } catch (error) {
      console.error('Error checking student absence:', error);
      res.status(500).json({ message: "Failed to check student absence" });
    }
  });

  // Get student absences by student ID for history modal
  app.get('/api/students/:studentId/absences', async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      const absences = await storage.getStudentAbsencesByStudent(studentId);
      
      res.json(absences);
    } catch (error) {
      console.error('Error fetching student absences:', error);
      res.status(500).json({ message: "Failed to fetch student absences" });
    }
  });

  // GPS Route Tracking API Endpoints
  
  // Record school arrival for GPS tracking
  app.post("/api/gps/school-arrival", async (req, res) => {
    try {
      const { sessionId, schoolId, driverId, latitude, longitude } = req.body;
      
      // Get session and route info
      const session = await storage.getPickupSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Create GPS track entry for school arrival
      const track = await storage.createGpsRouteTrack({
        sessionId: sessionId,
        driverId: driverId,
        routeId: session.routeId,
        schoolId: schoolId,
        latitude: latitude,
        longitude: longitude,
        eventType: 'school_arrival'
      });
      
      console.log(`📍 GPS school arrival recorded: Driver ${driverId} at school ${schoolId}`);
      res.json({ success: true, track });
    } catch (error) {
      console.error('Error recording school arrival:', error);
      res.status(500).json({ message: "Failed to record school arrival" });
    }
  });
  
  // Get GPS route tracks for a session
  app.get("/api/gps/sessions/:sessionId/tracks", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const tracks = await storage.getGpsRouteTracksBySession(sessionId);
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get GPS tracks" });
    }
  });
  
  // Get GPS route tracks for a driver  
  app.get("/api/gps/drivers/:driverId/tracks", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const tracks = await storage.getGpsRouteTracksByDriver(driverId);
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get driver GPS tracks" });
    }
  });
  
  // Create GPS route history entry when route starts
  app.post("/api/gps/route-history", async (req, res) => {
    try {
      const { sessionId, driverId, routeId, startLatitude, startLongitude } = req.body;
      
      const history = await storage.createGpsRouteHistory({
        sessionId: sessionId,
        driverId: driverId,
        routeId: routeId,
        startLatitude: startLatitude,
        startLongitude: startLongitude,
        startTime: new Date()
      });
      
      console.log(`📊 GPS route history started for session ${sessionId}`);
      res.json(history);
    } catch (error) {
      console.error('Error creating GPS route history:', error);
      res.status(500).json({ message: "Failed to create route history" });
    }
  });
  
  // Test endpoint to simulate GPS tracking for testing
  app.post("/api/gps/simulate-tracking/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      // Get session details
      const session = await storage.getPickupSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Generate test GPS points around Georgia area
      const baseLatitude = 33.9519;
      const baseLongitude = -84.1776;
      const testPoints = [];
      
      // Create 10 test GPS points with slight variations
      for (let i = 0; i < 10; i++) {
        const latVariation = (Math.random() - 0.5) * 0.01; // +/- 0.005 degrees
        const lngVariation = (Math.random() - 0.5) * 0.01;
        
        const testTrack = await storage.createGpsRouteTrack({
          sessionId: sessionId,
          driverId: session.driverId,
          routeId: session.routeId,
          latitude: (baseLatitude + latVariation).toString(),
          longitude: (baseLongitude + lngVariation).toString(),
          speed: Math.random() * 30 + 10, // 10-40 mph
          bearing: Math.random() * 360,
          accuracy: Math.random() * 10 + 5,
          eventType: 'location_update'
        });
        
        testPoints.push(testTrack);
      }
      
      console.log(`🧪 Generated ${testPoints.length} test GPS points for session ${sessionId}`);
      res.json({ success: true, pointsGenerated: testPoints.length, testPoints });
    } catch (error) {
      console.error('Error simulating GPS tracking:', error);
      res.status(500).json({ message: "Failed to simulate GPS tracking" });
    }
  });

  // Update GPS route history when route completes
  app.patch("/api/gps/route-history/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { endLatitude, endLongitude, totalDistance, routeDuration } = req.body;
      
      const history = await storage.getGpsRouteHistoryBySession(sessionId);
      if (!history) {
        return res.status(404).json({ message: "Route history not found" });
      }
      
      const updatedHistory = await storage.updateGpsRouteHistory(history.id, {
        endLatitude: endLatitude,
        endLongitude: endLongitude,
        endTime: new Date(),
        totalDistance: totalDistance,
        routeDuration: routeDuration
      });
      
      console.log(`📊 GPS route history completed for session ${sessionId}`);
      res.json(updatedHistory);
    } catch (error) {
      console.error('Error updating GPS route history:', error);
      res.status(500).json({ message: "Failed to update route history" });
    }
  });
  
  // Get detailed route data for admin map modal
  app.get("/api/route-details/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log(`Fetching route details for session ${sessionId}`);
      
      // Get session details
      const session = await storage.getPickupSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      console.log(`Found session:`, session);
      
      // Get driver info
      const driver = await storage.getUser(session.driverId);
      console.log(`Found driver:`, driver?.firstName, driver?.lastName);
      
      // Get route info
      const route = await storage.getRoute(session.routeId);
      console.log(`Found route:`, route?.name);
      
      // Get GPS tracking data from both sources
      const driverLocations = await storage.getDriverLocationsBySession(sessionId);
      console.log(`Found ${driverLocations.length} driver locations`);
      
      // Get GPS route tracks (more detailed tracking data)
      const gpsRouteTracks = await storage.getGpsRouteTracksBySession(sessionId);
      console.log(`Found ${gpsRouteTracks.length} GPS route tracks`);
      
      // Get student pickups for this session
      const allStudentPickups = await storage.getStudentPickups(sessionId);
      console.log(`Found ${allStudentPickups.length} student pickups`);
      
      // Get route schools
      const routeSchools = await storage.getRouteSchools(session.routeId);
      console.log(`Found ${routeSchools.length} route schools`);
      
      // Build school stops data with enhanced details
      const schoolStops = [];
      for (const rs of routeSchools) {
        const school = await storage.getSchool(rs.schoolId);
        const schoolPickups = allStudentPickups.filter(p => p.schoolId === rs.schoolId);
        
        // Calculate arrival and departure times from pickups
        const pickupTimes = schoolPickups
          .filter(p => p.pickedUpAt)
          .map(p => new Date(p.pickedUpAt))
          .sort((a, b) => a.getTime() - b.getTime());
        
        const arrivalTime = pickupTimes.length > 0 ? pickupTimes[0].toISOString() : rs.estimatedArrivalTime || null;
        const departureTime = pickupTimes.length > 0 ? pickupTimes[pickupTimes.length - 1].toISOString() : null;
        
        // Calculate duration at school
        let duration = 0;
        if (arrivalTime && departureTime) {
          duration = Math.round((new Date(departureTime).getTime() - new Date(arrivalTime).getTime()) / (1000 * 60));
        }
        
        schoolStops.push({
          schoolId: rs.schoolId,
          schoolName: school?.name || 'Unknown School',
          latitude: school?.latitude || '0',
          longitude: school?.longitude || '0',
          arrivalTime: arrivalTime,
          departureTime: departureTime,
          studentsPickedUp: schoolPickups.filter(p => p.status === 'picked_up').length,
          totalStudents: schoolPickups.length,
          duration: duration
        });
      }
      
      // Get current location from latest driver location
      const currentLocation = driverLocations.length > 0 ? driverLocations[driverLocations.length - 1] : null;
      
      // Build route path from GPS tracking data - prioritize GPS route tracks over driver locations
      let routePath = [];
      if (gpsRouteTracks.length > 0) {
        routePath = gpsRouteTracks.map((track, index) => ({
          id: track.id || index,
          latitude: track.latitude,
          longitude: track.longitude,
          timestamp: track.timestamp || track.createdAt,
          speed: track.speed || 0
        }));
      } else if (driverLocations.length > 0) {
        routePath = driverLocations.map((loc, index) => ({
          id: loc.id || index,
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp,
          speed: 0
        }));
      }
      
      const detailData = {
        sessionId: sessionId,
        routeId: session.routeId,
        driverId: session.driverId,
        driverName: driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown Driver',
        routeName: route?.name || `Route ${session.routeId}`,
        status: session.status,
        startTime: session.startTime,
        endTime: session.completedTime,
        durationMinutes: session.durationMinutes,
        routePath: routePath,
        schoolStops: schoolStops,
        currentLocation: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          timestamp: currentLocation.timestamp
        } : null
      };
      
      console.log(`Returning route details with ${routePath.length} GPS points and ${schoolStops.length} school stops`);
      res.json(detailData);
    } catch (error) {
      console.error('Error getting route details:', error);
      res.status(500).json({ message: "Failed to get route details", error: error.message });
    }
  });

  // Get GPS route history for admin dashboard
  app.get("/api/gps/route-history", async (req, res) => {
    try {
      const history = await storage.getGpsRouteHistory();
      
      // Enrich with driver and route information
      const enrichedHistory = await Promise.all(
        history.map(async (entry) => {
          const driver = await storage.getUser(entry.driverId);
          const route = await storage.getRoute(entry.routeId);
          const session = await storage.getPickupSession(entry.sessionId);
          
          return {
            ...entry,
            driver,
            route,
            session
          };
        })
      );
      
      res.json(enrichedHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to get GPS route history" });
    }
  });

  // Enhanced Route Maps API for Admin Dashboard with 30-Day Historical Data and Real-Time Tracking
  app.get("/api/route-maps", async (req, res) => {
    try {
      const routeMaps = await pool.query(`
        SELECT 
          rm.*,
          r.name as route_name,
          u.first_name, u.last_name,
          ps.date as session_date,
          ps.status as session_status,
          jsonb_array_length(rm.route_path) as path_points_count,
          jsonb_array_length(rm.school_stops) as stops_count,
          dl.latitude as current_latitude,
          dl.longitude as current_longitude,
          dl.updated_at as last_location_update
        FROM route_maps rm
        JOIN routes r ON rm.route_id = r.id  
        JOIN users u ON rm.driver_id = u.id
        LEFT JOIN pickup_sessions ps ON rm.session_id = ps.id
        LEFT JOIN driver_locations dl ON rm.driver_id = dl.driver_id AND dl.session_id = rm.session_id
        WHERE rm.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY rm.created_at DESC
        LIMIT 200
      `);
      
      res.json(routeMaps.rows || []);
    } catch (error) {
      console.error("Error fetching route maps:", error);
      res.status(500).json({ message: "Failed to fetch route maps" });
    }
  });

  app.get("/api/route-maps/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const routeMap = await pool.query(`
        SELECT 
          rm.*,
          r.name as route_name,
          u.first_name, u.last_name,
          ps.start_time, ps.end_time as session_end_time
        FROM route_maps rm
        JOIN routes r ON rm.route_id = r.id  
        JOIN users u ON rm.driver_id = u.id
        JOIN pickup_sessions ps ON rm.session_id = ps.id
        WHERE rm.session_id = $1
      `, [sessionId]);
      
      if (!routeMap.rows[0]) {
        return res.status(404).json({ message: "Route map not found" });
      }
      
      res.json(routeMap.rows[0]);
    } catch (error) {
      console.error("Error fetching route map:", error);
      res.status(500).json({ message: "Failed to fetch route map" });
    }
  });

  app.get("/api/route-stops/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const routeStops = await pool.query(`
        SELECT 
          rs.*,
          s.name as school_name,
          s.address as school_address
        FROM route_stops rs
        JOIN schools s ON rs.school_id = s.id
        WHERE rs.session_id = $1
        ORDER BY rs.arrival_time
      `, [sessionId]);
      
      res.json(routeStops.rows || []);
    } catch (error) {
      console.error("Error fetching route stops:", error);
      res.status(500).json({ message: "Failed to fetch route stops" });
    }
  });

  app.post("/api/route-stops", async (req, res) => {
    try {
      const { sessionId, schoolId, latitude, longitude, studentsPickedUp, totalStudents, notes } = req.body;
      
      const result = await pool.query(`
        INSERT INTO route_stops (session_id, school_id, arrival_time, latitude, longitude, students_picked_up, total_students, notes)
        VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)
        RETURNING *
      `, [sessionId, schoolId, latitude, longitude, studentsPickedUp || 0, totalStudents || 0, notes]);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating route stop:", error);
      res.status(500).json({ message: "Failed to create route stop" });
    }
  });

  // Master Admin Authentication
  app.post('/api/master-login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const [masterAdmin] = await db.select().from(masterAdmins).where(eq(masterAdmins.username, username));
      
      if (!masterAdmin || masterAdmin.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Create master admin token
      const token = createAuthToken(masterAdmin.id, masterAdmin.username, 'master_admin');
      
      res.json({
        id: masterAdmin.id,
        username: masterAdmin.username,
        email: masterAdmin.email,
        firstName: masterAdmin.firstName,
        lastName: masterAdmin.lastName,
        role: masterAdmin.role,
        token
      });
    } catch (error) {
      console.error('Master login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Master Admin - Get all businesses
  app.get('/api/master/businesses', async (req, res) => {
    try {
      const businessList = await db.select().from(businesses).orderBy(desc(businesses.createdAt));
      res.json(businessList);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      res.status(500).json({ message: 'Failed to fetch businesses' });
    }
  });

  // Master Admin - Create new business
  app.post('/api/master/businesses', async (req, res) => {
    try {
      const { name, displayName, contactEmail, contactPhone, address } = req.body;
      
      if (!name || !displayName || !contactEmail) {
        return res.status(400).json({ message: 'Name, display name, and contact email are required' });
      }

      const [newBusiness] = await db.insert(businesses).values({
        name,
        displayName,
        contactEmail,
        contactPhone,
        address
      }).returning();

      // Create default subscription
      await db.insert(businessSubscriptions).values({
        businessId: newBusiness.id,
        planType: 'basic',
        monthlyFee: '99.00',
        status: 'active'
      });

      res.json(newBusiness);
    } catch (error) {
      console.error('Error creating business:', error);
      res.status(500).json({ message: 'Failed to create business' });
    }
  });

  // Master Admin - Analytics
  app.get('/api/master/analytics', async (req, res) => {
    try {
      const totalActiveUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, true));
      const businessCount = await db.select({ count: sql<number>`count(*)` }).from(businesses).where(eq(businesses.isActive, true));
      const monthlyRevenue = businessCount[0].count * 99; // $99 per business
      
      res.json({
        totalActiveUsers: totalActiveUsers[0].count,
        monthlyRevenue,
        revenueGrowth: 15, // Mock growth percentage
        totalRoutesToday: 0,
        totalStudentsTransported: 0,
        totalDistance: 0,
        averageRouteTime: 0,
        onTimeRate: 95,
        userSatisfaction: 4.2,
        uptime: 99.9,
        errorRate: 0.1,
        responseTime: 180,
        averageRevenuePerBusiness: 99
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Master Admin - User feedback
  app.get('/api/master/feedback', async (req, res) => {
    try {
      const feedbackList = await db.select().from(userFeedback).orderBy(desc(userFeedback.createdAt));
      res.json(feedbackList);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ message: 'Failed to fetch feedback' });
    }
  });

  // Master Admin - System errors
  app.get('/api/master/errors', async (req, res) => {
    try {
      const errorList = await db.select().from(systemErrors).orderBy(desc(systemErrors.createdAt)).limit(50);
      res.json(errorList);
    } catch (error) {
      console.error('Error fetching errors:', error);
      res.status(500).json({ message: 'Failed to fetch errors' });
    }
  });

  // User feedback submission endpoint
  app.post('/api/feedback', async (req, res) => {
    try {
      const { feedbackType, subject, message, rating } = req.body;
      const userId = req.session?.userId;
      const businessId = req.session?.businessId;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      const [feedback] = await db.insert(userFeedback).values({
        userId,
        businessId,
        feedbackType: feedbackType || 'general',
        subject,
        message,
        rating
      }).returning();

      res.json(feedback);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ message: 'Failed to submit feedback' });
    }
  });

  // Route completion with automatic image generation
  app.post("/api/routes/:sessionId/complete", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { completionImageData } = req.body;
      
      console.log(`🏁 Completing route for session ${sessionId} with image generation`);
      
      // Get the pickup session
      const session = await storage.getPickupSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Ensure the session belongs to current user or user is admin
      const currentUser = req.session?.user;
      if (!currentUser || (session.driverId !== currentUser.id && currentUser.role !== 'admin')) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Complete the pickup session
      const completedTime = new Date();
      const startTime = session.startTime ? new Date(session.startTime) : completedTime;
      const durationMinutes = Math.round((completedTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      await storage.updatePickupSession(sessionId, {
        status: 'completed',
        completedTime: completedTime,
        durationMinutes: durationMinutes
      });
      
      // Get comprehensive route details for image generation
      const routeDetails = await pool.query(`
        SELECT 
          ps.id as session_id,
          ps.route_id,
          ps.driver_id,
          u.first_name || ' ' || u.last_name as driver_name,
          r.name as route_name,
          ps.start_time,
          ps.completed_time,
          ps.duration_minutes
        FROM pickup_sessions ps
        JOIN users u ON ps.driver_id = u.id
        JOIN routes r ON ps.route_id = r.id
        WHERE ps.id = $1
      `, [sessionId]);
      
      const routeDetail = routeDetails.rows[0];
      
      // Get GPS tracking data for image
      const gpsTrackingData = await storage.getGpsRouteTracksBySession(sessionId);
      const schoolStops = await storage.getRouteSchools(session.routeId);
      const studentPickups = await storage.getStudentPickups(sessionId);
      
      // Build comprehensive route completion record
      const routeCompletionData = {
        sessionId: sessionId,
        routeId: session.routeId,
        driverId: session.driverId,
        routeName: routeDetail.route_name,
        driverName: routeDetail.driver_name,
        startTime: routeDetail.start_time,
        endTime: completedTime,
        durationMinutes: durationMinutes,
        totalStops: schoolStops.length,
        totalStudentsPickedUp: studentPickups.filter(p => p.status === 'picked_up').length,
        gpsPointsRecorded: gpsTrackingData.length,
        completionImageData: completionImageData || null,
        routeStatus: 'completed'
      };
      
      // Save completion image data if provided
      if (completionImageData) {
        try {
          // Store completion image in GPS route history
          const existingHistory = await storage.getGpsRouteHistoryBySession(sessionId);
          if (existingHistory) {
            await storage.updateGpsRouteHistory(existingHistory.id, {
              endTime: completedTime,
              completionStatus: 'completed',
              totalStudentsPickedUp: routeCompletionData.totalStudentsPickedUp,
              schoolsVisited: schoolStops.length,
              routePath: {
                ...existingHistory.routePath,
                completionImage: completionImageData,
                completedAt: completedTime.toISOString()
              }
            });
            console.log('📊 Route completion image saved to GPS history');
          }
        } catch (imageError) {
          console.error('⚠️ Failed to save completion image:', imageError);
          // Don't fail the route completion if image saving fails
        }
      }
      
      // Broadcast completion to all connected clients
      broadcast({
        type: 'route_completed',
        sessionId: sessionId,
        routeId: session.routeId,
        driverId: session.driverId,
        completionTime: completedTime.toISOString(),
        durationMinutes: durationMinutes,
        studentsPickedUp: routeCompletionData.totalStudentsPickedUp
      });
      
      console.log(`🎉 Route ${session.routeId} completed by driver ${session.driverId} - Duration: ${durationMinutes} minutes`);
      
      res.json({
        message: "Route completed successfully",
        sessionId: sessionId,
        completionTime: completedTime.toISOString(),
        durationMinutes: durationMinutes,
        routeCompletionData: routeCompletionData
      });
      
    } catch (error) {
      console.error('Error completing route:', error);
      res.status(500).json({ message: "Failed to complete route", error: error.message });
    }
  });

  // Get route completion image
  app.get("/api/routes/:sessionId/completion-image", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      // Get GPS route history with completion image
      const history = await storage.getGpsRouteHistoryBySession(sessionId);
      if (!history || !history.routePath?.completionImage) {
        return res.status(404).json({ message: "Route completion image not found" });
      }
      
      res.json({
        sessionId: sessionId,
        completionImage: history.routePath.completionImage,
        completedAt: history.routePath.completedAt || history.endTime,
        routeName: history.routeName,
        driverId: history.driverId
      });
      
    } catch (error) {
      console.error('Error fetching completion image:', error);
      res.status(500).json({ message: "Failed to fetch completion image" });
    }
  });

  // GPS simulation endpoint for testing
  app.post("/api/gps/simulate/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      // Import and use the GPS simulator
      const { simulateGPSTracking } = await import('./gps-simulator');
      const result = await simulateGPSTracking(sessionId);
      
      res.json({
        message: "GPS tracking simulation completed",
        gpsPoints: result.totalPoints,
        schoolsVisited: result.schoolsVisited,
        sessionId: sessionId
      });
    } catch (error) {
      console.error('Error simulating GPS tracking:', error);
      res.status(500).json({ message: "Failed to simulate GPS tracking" });
    }
  });

  return httpServer;
}
