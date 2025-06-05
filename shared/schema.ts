import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("driver"), // driver, leadership
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  mobileNumber: text("mobile_number"), // For SMS notifications
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
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
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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
