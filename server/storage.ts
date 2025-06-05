import {
  users, schools, routes, routeSchools, students, routeAssignments,
  pickupSessions, studentPickups, notifications, driverLocations, issues,
  type User, type InsertUser, type School, type InsertSchool,
  type Route, type InsertRoute, type RouteSchool, type InsertRouteSchool,
  type Student, type InsertStudent, type RouteAssignment, type InsertRouteAssignment,
  type PickupSession, type InsertPickupSession, type StudentPickup, type InsertStudentPickup,
  type Notification, type InsertNotification, type DriverLocation, type InsertDriverLocation,
  type Issue, type InsertIssue
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Schools
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  
  // Routes
  getRoutes(): Promise<Route[]>;
  getRoute(id: number): Promise<Route | undefined>;
  getRoutesByDriver(driverId: number): Promise<Route[]>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: number, updates: Partial<Route>): Promise<Route>;
  deleteRoute(id: number): Promise<void>;
  
  // Route Schools
  getRouteSchools(routeId: number): Promise<RouteSchool[]>;
  createRouteSchool(routeSchool: InsertRouteSchool): Promise<RouteSchool>;
  deleteRouteSchools(routeId: number): Promise<void>;
  
  // Students
  getStudents(): Promise<Student[]>;
  getStudentsBySchool(schoolId: number): Promise<Student[]>;
  getStudentsByRoute(routeId: number): Promise<Student[]>;
  getStudentById(id: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  
  // Route Assignments
  getRouteAssignments(routeId: number): Promise<RouteAssignment[]>;
  createRouteAssignment(assignment: InsertRouteAssignment): Promise<RouteAssignment>;
  
  // Pickup Sessions
  getTodaysSessions(): Promise<PickupSession[]>;
  getSessionsByDriver(driverId: number, date: string): Promise<PickupSession[]>;
  getPickupSession(id: number): Promise<PickupSession | undefined>;
  createPickupSession(session: InsertPickupSession): Promise<PickupSession>;
  updatePickupSession(id: number, updates: Partial<PickupSession>): Promise<PickupSession>;
  
  // Student Pickups
  getStudentPickups(sessionId: number): Promise<StudentPickup[]>;
  createStudentPickup(pickup: InsertStudentPickup): Promise<StudentPickup>;
  updateStudentPickup(id: number, updates: Partial<StudentPickup>): Promise<StudentPickup>;
  
  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  
  // Driver Locations
  updateDriverLocation(location: InsertDriverLocation): Promise<DriverLocation>;
  getDriverLocation(driverId: number): Promise<DriverLocation | undefined>;
  
  // Issues
  getIssues(): Promise<Issue[]>;
  getIssue(id: number): Promise<Issue | undefined>;
  getIssuesByDriver(driverId: number): Promise<Issue[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, updates: Partial<Issue>): Promise<Issue>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true))
      .orderBy(asc(users.lastName), asc(users.firstName));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Schools
  async getSchools(): Promise<School[]> {
    return await db.select().from(schools).where(eq(schools.isActive, true)).orderBy(asc(schools.name));
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school || undefined;
  }

  async createSchool(insertSchool: InsertSchool): Promise<School> {
    const [school] = await db.insert(schools).values(insertSchool).returning();
    return school;
  }

  // Routes
  async getRoutes(): Promise<Route[]> {
    return await db.select().from(routes).where(eq(routes.isActive, true)).orderBy(asc(routes.name));
  }

  async getRoute(id: number): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route || undefined;
  }

  async getRoutesByDriver(driverId: number): Promise<Route[]> {
    return await db.select().from(routes)
      .where(and(eq(routes.driverId, driverId), eq(routes.isActive, true)))
      .orderBy(asc(routes.name));
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const [route] = await db.insert(routes).values(insertRoute).returning();
    return route;
  }

  async updateRoute(id: number, updates: Partial<Route>): Promise<Route> {
    const [route] = await db
      .update(routes)
      .set(updates)
      .where(eq(routes.id, id))
      .returning();
    return route;
  }

  async deleteRoute(id: number): Promise<void> {
    await db.delete(routes).where(eq(routes.id, id));
  }

  // Route Schools
  async getRouteSchools(routeId: number): Promise<RouteSchool[]> {
    return await db.select().from(routeSchools)
      .where(eq(routeSchools.routeId, routeId))
      .orderBy(asc(routeSchools.orderIndex));
  }

  async createRouteSchool(insertRouteSchool: InsertRouteSchool): Promise<RouteSchool> {
    const [routeSchool] = await db.insert(routeSchools).values(insertRouteSchool).returning();
    return routeSchool;
  }

  async deleteRouteSchools(routeId: number): Promise<void> {
    await db.delete(routeSchools).where(eq(routeSchools.routeId, routeId));
  }

  // Students
  async getStudents(): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.isActive, true))
      .orderBy(asc(students.lastName), asc(students.firstName));
  }

  async getStudentsBySchool(schoolId: number): Promise<Student[]> {
    return await db.select().from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)))
      .orderBy(asc(students.lastName), asc(students.firstName));
  }

  async getStudentsByRoute(routeId: number): Promise<Student[]> {
    return await db.select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      grade: students.grade,
      schoolId: students.schoolId,
      parentName: students.parentName,
      parentPhone: students.parentPhone,
      parentEmail: students.parentEmail,
      emergencyContact: students.emergencyContact,
      emergencyPhone: students.emergencyPhone,
      isActive: students.isActive,
    })
    .from(students)
    .innerJoin(routeAssignments, eq(students.id, routeAssignments.studentId))
    .where(and(
      eq(routeAssignments.routeId, routeId),
      eq(routeAssignments.isActive, true),
      eq(students.isActive, true)
    ))
    .orderBy(asc(students.lastName), asc(students.firstName));
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(insertStudent).returning();
    return student;
  }

  // Route Assignments
  async getRouteAssignments(routeId: number): Promise<RouteAssignment[]> {
    return await db.select().from(routeAssignments)
      .where(and(eq(routeAssignments.routeId, routeId), eq(routeAssignments.isActive, true)));
  }

  async createRouteAssignment(insertAssignment: InsertRouteAssignment): Promise<RouteAssignment> {
    const [assignment] = await db.insert(routeAssignments).values(insertAssignment).returning();
    return assignment;
  }

  // Pickup Sessions
  async getTodaysSessions(): Promise<PickupSession[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db.select().from(pickupSessions)
      .where(eq(pickupSessions.date, today))
      .orderBy(desc(pickupSessions.startTime));
  }

  async getSessionsByDriver(driverId: number, date: string): Promise<PickupSession[]> {
    return await db.select().from(pickupSessions)
      .where(and(eq(pickupSessions.driverId, driverId), eq(pickupSessions.date, date)))
      .orderBy(desc(pickupSessions.startTime));
  }

  async getPickupSession(id: number): Promise<PickupSession | undefined> {
    const [session] = await db.select().from(pickupSessions).where(eq(pickupSessions.id, id));
    return session || undefined;
  }

  async createPickupSession(insertSession: InsertPickupSession): Promise<PickupSession> {
    const [session] = await db.insert(pickupSessions).values(insertSession).returning();
    return session;
  }

  async updatePickupSession(id: number, updates: Partial<PickupSession>): Promise<PickupSession> {
    const [session] = await db.update(pickupSessions)
      .set(updates)
      .where(eq(pickupSessions.id, id))
      .returning();
    return session;
  }

  // Student Pickups
  async getStudentPickups(sessionId: number): Promise<StudentPickup[]> {
    return await db.select().from(studentPickups)
      .where(eq(studentPickups.sessionId, sessionId));
  }

  async createStudentPickup(insertPickup: InsertStudentPickup): Promise<StudentPickup> {
    const [pickup] = await db.insert(studentPickups).values(insertPickup).returning();
    return pickup;
  }

  async updateStudentPickup(id: number, updates: Partial<StudentPickup>): Promise<StudentPickup> {
    const [pickup] = await db.update(studentPickups)
      .set(updates)
      .where(eq(studentPickups.id, id))
      .returning();
    return pickup;
  }

  // Notifications
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Driver Locations
  async updateDriverLocation(insertLocation: InsertDriverLocation): Promise<DriverLocation> {
    const [location] = await db.insert(driverLocations).values(insertLocation).returning();
    return location;
  }

  async getDriverLocation(driverId: number): Promise<DriverLocation | undefined> {
    const [location] = await db.select().from(driverLocations)
      .where(eq(driverLocations.driverId, driverId))
      .orderBy(desc(driverLocations.timestamp))
      .limit(1);
    return location || undefined;
  }

  // Issues
  async getIssues(): Promise<Issue[]> {
    return await db.select().from(issues).orderBy(desc(issues.reportedAt));
  }

  async getIssue(id: number): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue || undefined;
  }

  async getIssuesByDriver(driverId: number): Promise<Issue[]> {
    return await db.select().from(issues).where(eq(issues.driverId, driverId)).orderBy(desc(issues.reportedAt));
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const [issue] = await db.insert(issues).values(insertIssue).returning();
    return issue;
  }

  async updateIssue(id: number, updates: Partial<Issue>): Promise<Issue> {
    const [issue] = await db.update(issues).set(updates).where(eq(issues.id, id)).returning();
    return issue;
  }
}

export const storage = new DatabaseStorage();
