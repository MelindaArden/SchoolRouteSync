import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Master Admin table for platform management
export const masterAdmins = pgTable("master_admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("master_admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Business/Company table for multi-tenancy
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  address: text("address"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Business subscriptions and billing
export const businessSubscriptions = pgTable("business_subscriptions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  planType: text("plan_type").notNull().default("basic"), // basic, pro, enterprise
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull().default("99.00"),
  status: text("status").notNull().default("active"), // active, suspended, cancelled
  trialEndDate: timestamp("trial_end_date"),
  billingCycleDay: integer("billing_cycle_day").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// App analytics and usage tracking
export const appAnalytics = pgTable("app_analytics", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  date: timestamp("date").notNull().defaultNow(),
  activeUsers: integer("active_users").notNull().default(0),
  routesCompleted: integer("routes_completed").notNull().default(0),
  studentsTransported: integer("students_transported").notNull().default(0),
  totalDistanceMiles: decimal("total_distance_miles", { precision: 10, scale: 2 }).notNull().default("0"),
  totalRuntimeMinutes: integer("total_runtime_minutes").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User feedback system
export const userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  feedbackType: text("feedback_type").notNull().default("general"), // bug, feature, general, complaint
  subject: text("subject"),
  message: text("message").notNull(),
  rating: integer("rating"), // 1-5 star rating
  status: text("status").notNull().default("pending"), // pending, reviewed, resolved
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// System error tracking
export const systemErrors = pgTable("system_errors", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businesses.id),
  userId: integer("user_id"),
  errorType: text("error_type"),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),
  url: text("url"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("driver"), // driver, leadership
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  mobileNumber: text("mobile_number"), // For SMS notifications
  notificationEmail: text("notification_email"), // Dedicated email for admin notifications and alerts
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  dismissalTime: text("dismissal_time").notNull(), // e.g., "15:30"
  contactPhone: text("contact_phone"),
  isActive: boolean("is_active").notNull().default(true),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  driverId: integer("driver_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const routeSchools = pgTable("route_schools", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull().references(() => routes.id),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  orderIndex: integer("order_index").notNull(),
  estimatedArrivalTime: text("estimated_arrival_time").notNull(),
  alertThresholdMinutes: integer("alert_threshold_minutes").default(10), // Alert if driver not on track X minutes before pickup
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  grade: text("grade").notNull(),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone").notNull(),
  parentEmail: text("parent_email"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  isActive: boolean("is_active").notNull().default(true),
});

export const routeAssignments = pgTable("route_assignments", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull().references(() => routes.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  isActive: boolean("is_active").notNull().default(true),
});

export const pickupSessions = pgTable("pickup_sessions", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull().references(() => routes.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  startTime: timestamp("start_time"),
  completedTime: timestamp("completed_time"),
  durationMinutes: integer("duration_minutes"), // Route duration in minutes
  notes: text("notes"),
});

export const studentPickups = pgTable("student_pickups", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => pickupSessions.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  pickedUpAt: timestamp("picked_up_at"),
  status: text("status").notNull().default("pending"), // pending, picked_up, absent, no_show
  driverNotes: text("driver_notes"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // route_delay, student_missing, emergency, pickup_complete
  title: text("title").notNull(),
  message: text("message").notNull(),
  recipientId: integer("recipient_id").references(() => users.id),
  sessionId: integer("session_id").references(() => pickupSessions.id),
  studentId: integer("student_id").references(() => students.id),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const driverLocations = pgTable("driver_locations", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => pickupSessions.id),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// GPS Route Tracking table for recording driver paths with school timestamps
export const gpsRouteTracks = pgTable("gps_route_tracks", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => pickupSessions.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  routeId: integer("route_id").notNull().references(() => routes.id),
  schoolId: integer("school_id").references(() => schools.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  speed: decimal("speed", { precision: 5, scale: 2 }),
  bearing: decimal("bearing", { precision: 5, scale: 2 }),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }),
  eventType: varchar("event_type", { length: 50 }).default("location_update"), // location_update, school_arrival, school_departure, route_start, route_end
  arrivalTime: timestamp("arrival_time"),
  departureTime: timestamp("departure_time"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// GPS Route History table for storing completed route paths
export const gpsRouteHistory = pgTable("gps_route_history", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => pickupSessions.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  routeId: integer("route_id").notNull().references(() => routes.id),
  routeName: varchar("route_name", { length: 255 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  totalDistance: decimal("total_distance", { precision: 8, scale: 2 }), // in kilometers
  averageSpeed: decimal("average_speed", { precision: 5, scale: 2 }), // in km/h
  maxSpeed: decimal("max_speed", { precision: 5, scale: 2 }), // in km/h
  schoolsVisited: integer("schools_visited").default(0),
  totalStudentsPickedUp: integer("total_students_picked_up").default(0),
  routePath: jsonb("route_path").$type<{
    coordinates: { lat: number; lng: number; timestamp: string; speed?: number }[];
    schoolTimestamps: { schoolId: number; schoolName: string; arrivalTime: string; departureTime?: string }[];
  }>(),
  completionStatus: varchar("completion_status", { length: 20 }).default("completed"), // completed, incomplete, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'issue' or 'maintenance'
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: text("status").default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  assignedTo: integer("assigned_to").references(() => users.id),
  notes: text("notes"),
});

export const pickupHistory = pgTable("pickup_history", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => pickupSessions.id).notNull(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  totalStudents: integer("total_students").notNull().default(0),
  studentsPickedUp: integer("students_picked_up").notNull().default(0),
  pickupDetails: text("pickup_details"), // JSON string of pickup data
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const missedSchoolAlerts = pgTable("missed_school_alerts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => pickupSessions.id).notNull(),
  routeSchoolId: integer("route_school_id").references(() => routeSchools.id).notNull(),
  driverId: integer("driver_id").references(() => users.id).notNull(),
  alertType: text("alert_type").notNull(), // 'late_arrival', 'missed_school', 'off_route'
  expectedTime: text("expected_time").notNull(),
  actualTime: timestamp("actual_time"),
  driverLocation: text("driver_location"), // JSON: {lat, lng, timestamp}
  alertSent: boolean("alert_sent").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentAbsences = pgTable("student_absences", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  absenceDate: text("absence_date").notNull(), // YYYY-MM-DD format
  reason: text("reason"), // Optional reason for absence
  markedBy: integer("marked_by").references(() => users.id), // Admin who marked the absence
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced route tracking for admins - detailed stops with timestamps
export const routeStops = pgTable("route_stops", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => pickupSessions.id),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  arrivalTime: timestamp("arrival_time").notNull(),
  departureTime: timestamp("departure_time"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  studentsPickedUp: integer("students_picked_up").notNull().default(0),
  totalStudents: integer("total_students").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Complete route tracking with map data for admin view
export const routeMaps = pgTable("route_maps", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => pickupSessions.id),
  routeId: integer("route_id").notNull().references(() => routes.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  totalDurationMinutes: integer("total_duration_minutes"),
  totalDistanceMiles: decimal("total_distance_miles", { precision: 8, scale: 2 }),
  routePath: jsonb("route_path").notNull(), // Array of {lat, lng, timestamp} points
  schoolStops: jsonb("school_stops").notNull(), // Array of stop details with timestamps
  completionStatus: text("completion_status").notNull().default("in_progress"), // in_progress, completed, abandoned
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations for proper joins
export const businessesRelations = relations(businesses, ({ many }) => ({
  users: many(users),
  schools: many(schools),
  routes: many(routes),
  students: many(students),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  business: one(businesses, {
    fields: [users.businessId],
    references: [businesses.id],
  }),
  routes: many(routes),
  pickupSessions: many(pickupSessions),
  notifications: many(notifications),
  locations: many(driverLocations),
  issues: many(issues),
}));

export const schoolsRelations = relations(schools, ({ many }) => ({
  students: many(students),
  routeSchools: many(routeSchools),
  routeAssignments: many(routeAssignments),
  studentPickups: many(studentPickups),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  driver: one(users, {
    fields: [routes.driverId],
    references: [users.id],
  }),
  routeSchools: many(routeSchools),
  routeAssignments: many(routeAssignments),
  pickupSessions: many(pickupSessions),
}));

export const routeSchoolsRelations = relations(routeSchools, ({ one }) => ({
  route: one(routes, {
    fields: [routeSchools.routeId],
    references: [routes.id],
  }),
  school: one(schools, {
    fields: [routeSchools.schoolId],
    references: [schools.id],
  }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  routeAssignments: many(routeAssignments),
  studentPickups: many(studentPickups),
  notifications: many(notifications),
}));

export const routeAssignmentsRelations = relations(routeAssignments, ({ one }) => ({
  route: one(routes, {
    fields: [routeAssignments.routeId],
    references: [routes.id],
  }),
  student: one(students, {
    fields: [routeAssignments.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [routeAssignments.schoolId],
    references: [schools.id],
  }),
}));

export const pickupSessionsRelations = relations(pickupSessions, ({ one, many }) => ({
  route: one(routes, {
    fields: [pickupSessions.routeId],
    references: [routes.id],
  }),
  driver: one(users, {
    fields: [pickupSessions.driverId],
    references: [users.id],
  }),
  studentPickups: many(studentPickups),
  notifications: many(notifications),
  driverLocations: many(driverLocations),
}));

export const studentPickupsRelations = relations(studentPickups, ({ one }) => ({
  session: one(pickupSessions, {
    fields: [studentPickups.sessionId],
    references: [pickupSessions.id],
  }),
  student: one(students, {
    fields: [studentPickups.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [studentPickups.schoolId],
    references: [schools.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
  session: one(pickupSessions, {
    fields: [notifications.sessionId],
    references: [pickupSessions.id],
  }),
  student: one(students, {
    fields: [notifications.studentId],
    references: [students.id],
  }),
}));

export const driverLocationsRelations = relations(driverLocations, ({ one }) => ({
  driver: one(users, {
    fields: [driverLocations.driverId],
    references: [users.id],
  }),
  session: one(pickupSessions, {
    fields: [driverLocations.sessionId],
    references: [pickupSessions.id],
  }),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  driver: one(users, {
    fields: [issues.driverId],
    references: [users.id],
  }),
  assignedUser: one(users, {
    fields: [issues.assignedTo],
    references: [users.id],
  }),
}));

export const pickupHistoryRelations = relations(pickupHistory, ({ one }) => ({
  session: one(pickupSessions, {
    fields: [pickupHistory.sessionId],
    references: [pickupSessions.id],
  }),
  route: one(routes, {
    fields: [pickupHistory.routeId],
    references: [routes.id],
  }),
  driver: one(users, {
    fields: [pickupHistory.driverId],
    references: [users.id],
  }),
}));

export const missedSchoolAlertsRelations = relations(missedSchoolAlerts, ({ one }) => ({
  session: one(pickupSessions, {
    fields: [missedSchoolAlerts.sessionId],
    references: [pickupSessions.id],
  }),
  routeSchool: one(routeSchools, {
    fields: [missedSchoolAlerts.routeSchoolId],
    references: [routeSchools.id],
  }),
  driver: one(users, {
    fields: [missedSchoolAlerts.driverId],
    references: [users.id],
  }),
}));

export const studentAbsencesRelations = relations(studentAbsences, ({ one }) => ({
  student: one(students, {
    fields: [studentAbsences.studentId],
    references: [students.id],
  }),
  markedByUser: one(users, {
    fields: [studentAbsences.markedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
});

export const insertRouteSchoolSchema = createInsertSchema(routeSchools).omit({
  id: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
});

export const insertRouteAssignmentSchema = createInsertSchema(routeAssignments).omit({
  id: true,
});

export const insertPickupSessionSchema = createInsertSchema(pickupSessions).omit({
  id: true,
  startTime: true,
  completedTime: true,
});

export const insertStudentPickupSchema = createInsertSchema(studentPickups).omit({
  id: true,
  pickedUpAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertDriverLocationSchema = createInsertSchema(driverLocations).omit({
  id: true,
  timestamp: true,
});

export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  reportedAt: true,
});

export const insertPickupHistorySchema = createInsertSchema(pickupHistory).omit({
  id: true,
  createdAt: true,
});

export const insertMissedSchoolAlertSchema = createInsertSchema(missedSchoolAlerts).omit({
  id: true,
  createdAt: true,
});

export const insertStudentAbsenceSchema = createInsertSchema(studentAbsences).omit({
  id: true,
  createdAt: true,
});

export const insertGpsRouteTrackSchema = createInsertSchema(gpsRouteTracks).omit({
  id: true,
  timestamp: true,
  createdAt: true,
});

export const insertGpsRouteHistorySchema = createInsertSchema(gpsRouteHistory).omit({
  id: true,
  createdAt: true,
});

// GPS Route Tracking Relations
export const gpsRouteTracksRelations = relations(gpsRouteTracks, ({ one }) => ({
  session: one(pickupSessions, {
    fields: [gpsRouteTracks.sessionId],
    references: [pickupSessions.id],
  }),
  driver: one(users, {
    fields: [gpsRouteTracks.driverId],
    references: [users.id],
  }),
  route: one(routes, {
    fields: [gpsRouteTracks.routeId],
    references: [routes.id],
  }),
  school: one(schools, {
    fields: [gpsRouteTracks.schoolId],
    references: [schools.id],
  }),
}));

// GPS Route History Relations
export const gpsRouteHistoryRelations = relations(gpsRouteHistory, ({ one }) => ({
  session: one(pickupSessions, {
    fields: [gpsRouteHistory.sessionId],
    references: [pickupSessions.id],
  }),
  driver: one(users, {
    fields: [gpsRouteHistory.driverId],
    references: [users.id],
  }),
  route: one(routes, {
    fields: [gpsRouteHistory.routeId],
    references: [routes.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type RouteSchool = typeof routeSchools.$inferSelect;
export type InsertRouteSchool = z.infer<typeof insertRouteSchoolSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type RouteAssignment = typeof routeAssignments.$inferSelect;
export type InsertRouteAssignment = z.infer<typeof insertRouteAssignmentSchema>;
export type PickupSession = typeof pickupSessions.$inferSelect;
export type InsertPickupSession = z.infer<typeof insertPickupSessionSchema>;
export type StudentPickup = typeof studentPickups.$inferSelect;
export type InsertStudentPickup = z.infer<typeof insertStudentPickupSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type DriverLocation = typeof driverLocations.$inferSelect;
export type InsertDriverLocation = z.infer<typeof insertDriverLocationSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type PickupHistory = typeof pickupHistory.$inferSelect;
export type InsertPickupHistory = z.infer<typeof insertPickupHistorySchema>;
export type MissedSchoolAlert = typeof missedSchoolAlerts.$inferSelect;
export type InsertMissedSchoolAlert = z.infer<typeof insertMissedSchoolAlertSchema>;
export type StudentAbsence = typeof studentAbsences.$inferSelect;
export type InsertStudentAbsence = z.infer<typeof insertStudentAbsenceSchema>;
export type GpsRouteTrack = typeof gpsRouteTracks.$inferSelect;
export type InsertGpsRouteTrack = z.infer<typeof insertGpsRouteTrackSchema>;
export type GpsRouteHistory = typeof gpsRouteHistory.$inferSelect;
export type InsertGpsRouteHistory = z.infer<typeof insertGpsRouteHistorySchema>;
