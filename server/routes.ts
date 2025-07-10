import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import "./types"; // Import session type declarations
import { createAuthToken, validateAuthToken, deleteAuthToken } from "./auth-tokens";
import { db, pool } from "./db";
import { pickupSessions, notifications, PickupSession, routeSchools, schools } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
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

  // Enhanced login endpoint for production deployment and mobile Safari
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
        sessionId: req.sessionID
      });
      
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        console.log(`Login failed for username "${username}":`, {
          userFound: !!user,
          storedPassword: user?.password,
          providedPassword: password,
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
            userFound: !!user
          }
        });
      }

      // Create authentication token for mobile compatibility
      console.log(`About to create auth token for ${username}`);
      let authToken;
      try {
        authToken = createAuthToken(user.id, user.username, user.role);
        console.log(`Created auth token for ${username}: ${authToken.substring(0, 16)}...`);
      } catch (error) {
        console.error(`Token creation failed for ${username}:`, error);
        authToken = `fallback_${user.id}_${Date.now()}`;
      }
      
      // Enhanced session creation for production
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      // Force session save for mobile browsers
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
      });

      console.log(`Production login successful for ${username}:`, {
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
        debug: {
          tokenCreated: true,
          sessionCreated: true,
          sessionId: req.sessionID,
          userAgent: req.headers['user-agent'],
          isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || ''),
          loginMethod: 'production-enhanced',
          timestamp: new Date().toISOString()
        }
      });
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
      
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
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

  // Create pickup session with enhanced student tracking
  app.post("/api/pickup-sessions", async (req, res) => {
    try {
      const sessionData = insertPickupSessionSchema.parse(req.body);
      const session = await storage.createPickupSession(sessionData);
      console.log('📝 Created pickup session:', session);
      
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
      
      // Enrich sessions with driver, route, and pickup details
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          const driver = await storage.getUser(session.driverId);
          const route = await storage.getRoute(session.routeId);
          const studentPickups = await storage.getStudentPickups(session.id);
          
          return {
            ...session,
            driver,
            route,
            studentPickups
          };
        })
      );
      
      res.json(enrichedSessions);
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
        res.json(pickups);
      } else {
        res.status(400).json({ message: "sessionId query parameter required" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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

      // Get pickup details for history
      const pickups = await storage.getStudentPickups(sessionId);
      const pickedUpCount = pickups.filter(p => p.status === "picked_up").length;
      
      // Calculate duration properly
      let durationMinutes = null;
      const endTime = new Date();
      
      if (session.startTime) {
        const startTime = new Date(session.startTime);
        durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        console.log('Route duration calculated:', { 
          startTime: startTime.toISOString(), 
          endTime: endTime.toISOString(), 
          durationMinutes 
        });
      } else {
        // If no start time, estimate duration based on first pickup time
        const firstPickupTime = pickups
          .filter(p => p.pickedUpAt)
          .map(p => new Date(p.pickedUpAt!))
          .sort((a, b) => a.getTime() - b.getTime())[0];
        
        if (firstPickupTime) {
          durationMinutes = Math.round((endTime.getTime() - firstPickupTime.getTime()) / (1000 * 60));
          // Ensure minimum duration of 1 minute for very quick routes
          if (durationMinutes < 1) {
            durationMinutes = Math.max(1, Math.round((endTime.getTime() - firstPickupTime.getTime()) / (1000 * 60 * 60) * 60));
            if (durationMinutes < 1) durationMinutes = 1;
          }
          console.log('Route duration estimated from first pickup:', { 
            firstPickupTime: firstPickupTime.toISOString(), 
            endTime: endTime.toISOString(), 
            durationMinutes,
            actualSeconds: (endTime.getTime() - firstPickupTime.getTime()) / 1000
          });
        } else {
          // Default to 5 minutes if no pickup times available
          durationMinutes = 5;
          console.log('No pickup times found, using default 5 minutes duration');
        }
      }

      // Update session to completed with duration
      const updateData: any = {
        status: "completed",
        completedTime: endTime
      };
      
      if (durationMinutes !== null) {
        updateData.durationMinutes = durationMinutes;
      }
      
      console.log('Final update data for session:', updateData);

      await storage.updatePickupSession(sessionId, updateData);
      console.log('Session updated with completion data:', updateData);

      // Save to pickup history
      await storage.createPickupHistory({
        sessionId,
        routeId: session.routeId,
        driverId: session.driverId,
        date: session.date,
        completedAt: endTime,
        totalStudents: pickups.length,
        studentsPickedUp: pickedUpCount,
        pickupDetails: JSON.stringify(pickups),
        notes: req.body.notes || null
      });

      // Broadcast completion
      broadcast({
        type: 'route_completed',
        sessionId,
        routeId: session.routeId,
        driverId: session.driverId,
        completedAt: endTime.toISOString()
      });

      res.json({ 
        message: "Route completed and saved to history", 
        durationMinutes,
        completedAt: endTime.toISOString()
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

  // Update driver location
  app.post("/api/drivers/:driverId/location", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const { latitude, longitude, sessionId } = locationUpdateSchema.parse(req.body);
      
      const location = await storage.updateDriverLocation({
        driverId,
        latitude,
        longitude,
        sessionId,
      });

      // Check for proximity alerts if session is active
      if (sessionId) {
        await checkProximityAlerts(sessionId, location);
      }

      broadcast({
        type: 'location_updated',
        driverId,
        location,
      }, driverId);

      res.json(location);
    } catch (error) {
      res.status(400).json({ message: "Invalid location data" });
    }
  });

  // Get all driver locations
  app.get("/api/driver-locations", async (req, res) => {
    try {
      const locations = await storage.getDriverLocations();
      
      // Enrich with driver and session information
      const enrichedLocations = await Promise.all(
        locations.map(async (location) => {
          const driver = await storage.getUser(location.driverId);
          let session = null;
          
          if (location.sessionId) {
            session = await storage.getPickupSession(location.sessionId);
            if (session) {
              const route = await storage.getRoute(session.routeId);
              session = { ...session, route };
            }
          }
          
          return {
            ...location,
            driver,
            session,
          };
        })
      );
      
      res.json(enrichedLocations);
    } catch (error) {
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

  return httpServer;
}
