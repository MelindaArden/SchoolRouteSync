import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { sendSMSToAdmins } from "./sms";
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

  // Authentication
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
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

  // Get driver routes
  app.get("/api/drivers/:driverId/routes", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const routes = await storage.getRoutesByDriver(driverId);
      
      // Get detailed route information including schools and students
      const detailedRoutes = await Promise.all(
        routes.map(async (route) => {
          const routeSchools = await storage.getRouteSchools(route.id);
          const students = await storage.getStudentsByRoute(route.id);
          const assignments = await storage.getRouteAssignments(route.id);
          
          // Get school details for each route school
          const schoolsWithDetails = await Promise.all(
            routeSchools.map(async (rs) => {
              const school = await storage.getSchool(rs.schoolId);
              const schoolStudents = students.filter(s => 
                assignments.some(a => a.studentId === s.id && a.schoolId === rs.schoolId)
              );
              return {
                ...rs,
                school,
                students: schoolStudents,
              };
            })
          );
          
          // Sort schools by order
          schoolsWithDetails.sort((a, b) => a.estimatedArrivalTime.localeCompare(b.estimatedArrivalTime));
          
          return {
            ...route,
            schools: schoolsWithDetails,
            totalStudents: students.length,
          };
        })
      );
      
      res.json(detailedRoutes);
    } catch (error) {
      console.error('Error fetching driver routes:', error);
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

      // Group students by school
      const schoolsWithStudents = await Promise.all(
        routeSchools.map(async (rs) => {
          const school = await storage.getSchool(rs.schoolId);
          const schoolStudents = students.filter(s => 
            assignments.some(a => a.studentId === s.id && a.schoolId === rs.schoolId)
          );
          
          return {
            ...rs,
            school,
            students: schoolStudents,
          };
        })
      );

      res.json({
        ...route,
        schools: schoolsWithStudents,
        totalStudents: students.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create pickup session
  app.post("/api/pickup-sessions", async (req, res) => {
    try {
      const sessionData = insertPickupSessionSchema.parse(req.body);
      const session = await storage.createPickupSession(sessionData);
      
      // Create student pickup records for all students on the route
      const students = await storage.getStudentsByRoute(session.routeId);
      const assignments = await storage.getRouteAssignments(session.routeId);
      
      for (const student of students) {
        const assignment = assignments.find(a => a.studentId === student.id);
        if (assignment) {
          await storage.createStudentPickup({
            sessionId: session.id,
            studentId: student.id,
            schoolId: assignment.schoolId,
            status: "pending",
          });
        }
      }

      broadcast({
        type: 'session_created',
        session,
      });

      res.json(session);
    } catch (error) {
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
      const { status, driverNotes, pickedUpAt } = updatePickupSchema.parse(req.body);
      
      const updates: any = { status, driverNotes };
      if (status === "picked_up" && pickedUpAt) {
        updates.pickedUpAt = new Date(pickedUpAt);
      } else if (status === "picked_up") {
        updates.pickedUpAt = new Date();
      }

      const pickup = await storage.updateStudentPickup(pickupId, updates);
      
      broadcast({
        type: 'pickup_updated',
        pickup,
      });

      res.json(pickup);
    } catch (error) {
      res.status(400).json({ message: "Invalid pickup data" });
    }
  });

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
  app.get("/api/pickup-sessions/today", async (req, res) => {
    try {
      const sessions = await storage.getTodaysSessions();
      
      // Get detailed session info
      const detailedSessions = await Promise.all(
        sessions.map(async (session) => {
          const [driver, route, pickups] = await Promise.all([
            storage.getUser(session.driverId),
            storage.getRoute(session.routeId),
            storage.getStudentPickups(session.id)
          ]);
          
          // Get route schools if route exists
          let routeWithSchools = route;
          if (route) {
            const routeSchools = await storage.getRouteSchools(route.id);
            const schoolsWithDetails = await Promise.all(
              routeSchools.map(async (rs) => ({
                ...rs,
                school: await storage.getSchool(rs.schoolId)
              }))
            );
            routeWithSchools = { 
              ...route, 
              schools: schoolsWithDetails 
            } as typeof route & { schools: typeof schoolsWithDetails };
          }
          
          const completedPickups = pickups.filter(p => p.status === "picked_up").length;
          
          return {
            ...session,
            driver,
            route: routeWithSchools,
            pickups,
            totalStudents: pickups.length,
            completedPickups,
            progressPercent: pickups.length > 0 ? (completedPickups / pickups.length) * 100 : 0,
          };
        })
      );

      res.json(detailedSessions);
    } catch (error) {
      console.error("Error fetching today's sessions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
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

      // Send SMS notifications to admin mobile numbers (avoid duplicates)
      const adminNumbers = adminUsers
        .filter(admin => admin.mobileNumber)
        .map(admin => admin.mobileNumber!);
      const uniqueAdminNumbers = Array.from(new Set(adminNumbers));

      if (uniqueAdminNumbers.length > 0) {
        const priority = issueData.priority || "medium";
        const smsMessage = `🚨 ${issueData.type === "maintenance" ? "Van Maintenance Request" : "Driver Issue Report"}
Driver: ${driver?.firstName} ${driver?.lastName}
Issue: ${issueData.title}
Priority: ${priority.toUpperCase()}
Description: ${issueData.description}

Please check the admin dashboard for details.`;

        await sendSMSToAdmins(uniqueAdminNumbers, smsMessage);
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
      const schoolData = insertSchoolSchema.parse(req.body);
      const school = await storage.createSchool(schoolData);
      res.json(school);
    } catch (error) {
      res.status(400).json({ message: "Invalid school data" });
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

  // Create route
  app.post("/api/routes", async (req, res) => {
    try {
      const routeData = insertRouteSchema.parse(req.body);
      const route = await storage.createRoute(routeData);
      res.json(route);
    } catch (error) {
      res.status(400).json({ message: "Invalid route data" });
    }
  });

  // Update route
  app.patch("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const updates = req.body;
      const route = await storage.updateRoute(routeId, updates);
      res.json(route);
    } catch (error) {
      res.status(400).json({ message: "Failed to update route" });
    }
  });

  // Delete route
  app.delete("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      await storage.deleteRoute(routeId);
      res.json({ message: "Route deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete route" });
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

  return httpServer;
}
