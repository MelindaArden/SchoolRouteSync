import {
  users, schools, routes, routeSchools, students, routeAssignments,
  pickupSessions, studentPickups, notifications, driverLocations, issues, pickupHistory, missedSchoolAlerts, studentAbsences,
  gpsRouteTracks, gpsRouteHistory,
  type User, type InsertUser, type School, type InsertSchool,
  type Route, type InsertRoute, type RouteSchool, type InsertRouteSchool,
  type Student, type InsertStudent, type RouteAssignment, type InsertRouteAssignment,
  type PickupSession, type InsertPickupSession, type StudentPickup, type InsertStudentPickup,
  type Notification, type InsertNotification, type DriverLocation, type InsertDriverLocation,
  type Issue, type InsertIssue, type PickupHistory, type InsertPickupHistory,
  type MissedSchoolAlert, type InsertMissedSchoolAlert,
  type StudentAbsence, type InsertStudentAbsence,
  type GpsRouteTrack, type InsertGpsRouteTrack,
  type GpsRouteHistory, type InsertGpsRouteHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Schools
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: number, updates: Partial<School>): Promise<School>;
  deleteSchool(id: number): Promise<void>;
  
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
  updateStudent(id: number, updates: Partial<Student>): Promise<Student>;
  deleteStudent(id: number): Promise<void>;
  
  // Route Assignments
  getRouteAssignments(routeId: number): Promise<RouteAssignment[]>;
  createRouteAssignment(assignment: InsertRouteAssignment): Promise<RouteAssignment>;
  
  // Pickup Sessions
  getTodaysSessions(): Promise<PickupSession[]>;
  getPickupSessionsToday(): Promise<PickupSession[]>;
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
  getDriverLocations(): Promise<DriverLocation[]>;
  getDriverLocationsBySession(sessionId: number): Promise<DriverLocation[]>;
  
  // Issues
  getIssues(): Promise<Issue[]>;
  getIssue(id: number): Promise<Issue | undefined>;
  getIssuesByDriver(driverId: number): Promise<Issue[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, updates: Partial<Issue>): Promise<Issue>;
  
  // Pickup History
  getPickupHistory(): Promise<PickupHistory[]>;
  getPickupHistoryByDriver(driverId: number): Promise<PickupHistory[]>;
  getPickupHistoryByRoute(routeId: number): Promise<PickupHistory[]>;
  createPickupHistory(history: InsertPickupHistory): Promise<PickupHistory>;
  
  // Missed School Alerts
  getMissedSchoolAlerts(): Promise<MissedSchoolAlert[]>;
  getMissedSchoolAlertsBySession(sessionId: number): Promise<MissedSchoolAlert[]>;
  createMissedSchoolAlert(alert: InsertMissedSchoolAlert): Promise<MissedSchoolAlert>;
  updateMissedSchoolAlert(id: number, updates: Partial<MissedSchoolAlert>): Promise<MissedSchoolAlert>;
  
  // Student Absences
  getStudentAbsences(): Promise<StudentAbsence[]>;
  getStudentAbsencesByDate(date: string): Promise<StudentAbsence[]>;
  getStudentAbsencesByStudent(studentId: number): Promise<StudentAbsence[]>;
  createStudentAbsence(absence: InsertStudentAbsence): Promise<StudentAbsence>;
  deleteStudentAbsence(id: number): Promise<void>;
  checkStudentAbsence(studentId: number, date: string): Promise<boolean>;
  
  // GPS Route Tracking
  createGpsRouteTrack(track: InsertGpsRouteTrack): Promise<GpsRouteTrack>;
  getGpsRouteTracksBySession(sessionId: number): Promise<GpsRouteTrack[]>;
  getGpsRouteTracksByDriver(driverId: number): Promise<GpsRouteTrack[]>;
  updateGpsRouteTrack(id: number, updates: Partial<GpsRouteTrack>): Promise<GpsRouteTrack>;
  
  // GPS Route History
  createGpsRouteHistory(history: InsertGpsRouteHistory): Promise<GpsRouteHistory>;
  getGpsRouteHistory(): Promise<GpsRouteHistory[]>;
  getGpsRouteHistoryByDriver(driverId: number): Promise<GpsRouteHistory[]>;
  getGpsRouteHistoryBySession(sessionId: number): Promise<GpsRouteHistory | undefined>;
  updateGpsRouteHistory(id: number, updates: Partial<GpsRouteHistory>): Promise<GpsRouteHistory>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.lastName), asc(users.firstName));
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

  async updateSchool(id: number, updates: Partial<School>): Promise<School> {
    const [school] = await db
      .update(schools)
      .set(updates)
      .where(eq(schools.id, id))
      .returning();
    return school;
  }

  async deleteSchool(id: number): Promise<void> {
    // Delete students first due to foreign key constraint
    await db.delete(students).where(eq(students.schoolId, id));
    // Delete route schools
    await db.delete(routeSchools).where(eq(routeSchools.schoolId, id));
    // Delete the school
    await db.delete(schools).where(eq(schools.id, id));
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
    try {
      // First get all pickup sessions for this route
      const sessions = await db.select().from(pickupSessions).where(eq(pickupSessions.routeId, id));
      const sessionIds = sessions.map(s => s.id);
      
      // Get all route schools for this route
      const routeSchoolsData = await db.select().from(routeSchools).where(eq(routeSchools.routeId, id));
      const routeSchoolIds = routeSchoolsData.map(rs => rs.id);
      
      // Delete student pickups that reference these sessions
      for (const sessionId of sessionIds) {
        await db.delete(studentPickups).where(eq(studentPickups.sessionId, sessionId));
      }
      
      // Delete driver locations that reference these sessions
      for (const sessionId of sessionIds) {
        await db.delete(driverLocations).where(eq(driverLocations.sessionId, sessionId));
      }
      
      // Delete missed school alerts that reference route schools
      for (const routeSchoolId of routeSchoolIds) {
        await db.delete(missedSchoolAlerts).where(eq(missedSchoolAlerts.routeSchoolId, routeSchoolId));
      }
      
      // Delete pickup history before deleting sessions (due to foreign key constraint)
      await db.delete(pickupHistory).where(eq(pickupHistory.routeId, id));
      
      // Delete all other related records to prevent foreign key constraint violations
      await db.delete(routeSchools).where(eq(routeSchools.routeId, id));
      await db.delete(routeAssignments).where(eq(routeAssignments.routeId, id));
      await db.delete(pickupSessions).where(eq(pickupSessions.routeId, id));
      
      // Then delete the route itself
      await db.delete(routes).where(eq(routes.id, id));
    } catch (error) {
      console.error('Error deleting route:', error);
      throw error;
    }
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

  async updateStudent(id: number, updates: Partial<Student>): Promise<Student> {
    const [student] = await db
      .update(students)
      .set(updates)
      .where(eq(students.id, id))
      .returning();
    return student;
  }

  async deleteStudent(id: number): Promise<void> {
    // Delete route assignments first
    await db.delete(routeAssignments).where(eq(routeAssignments.studentId, id));
    // Delete student pickups
    await db.delete(studentPickups).where(eq(studentPickups.studentId, id));
    // Delete the student
    await db.delete(students).where(eq(students.id, id));
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
      .orderBy(desc(pickupSessions.id));
  }

  async getPickupSessionsToday(): Promise<PickupSession[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db.select().from(pickupSessions)
      .where(eq(pickupSessions.date, today))
      .orderBy(desc(pickupSessions.id));
  }

  async getSessionsByDriver(driverId: number, date: string): Promise<PickupSession[]> {
    return await db.select().from(pickupSessions)
      .where(and(eq(pickupSessions.driverId, driverId), eq(pickupSessions.date, date)))
      .orderBy(desc(pickupSessions.id)); // Use id instead of startTime since startTime can be null
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

  async getDriverLocations(): Promise<DriverLocation[]> {
    return await db.select().from(driverLocations).orderBy(desc(driverLocations.timestamp));
  }

  async getDriverLocationsBySession(sessionId: number): Promise<DriverLocation[]> {
    return await db.select().from(driverLocations)
      .where(eq(driverLocations.sessionId, sessionId))
      .orderBy(desc(driverLocations.timestamp));
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

  // Pickup History
  async getPickupHistory(): Promise<PickupHistory[]> {
    return await db.select().from(pickupHistory).orderBy(desc(pickupHistory.completedAt));
  }

  async getPickupHistoryByDriver(driverId: number): Promise<PickupHistory[]> {
    return await db.select().from(pickupHistory)
      .where(eq(pickupHistory.driverId, driverId))
      .orderBy(desc(pickupHistory.completedAt));
  }

  async getPickupHistoryByRoute(routeId: number): Promise<PickupHistory[]> {
    return await db.select().from(pickupHistory)
      .where(eq(pickupHistory.routeId, routeId))
      .orderBy(desc(pickupHistory.completedAt));
  }

  async createPickupHistory(insertHistory: InsertPickupHistory): Promise<PickupHistory> {
    const [history] = await db.insert(pickupHistory).values(insertHistory).returning();
    return history;
  }

  // Missed School Alerts
  async getMissedSchoolAlerts(): Promise<MissedSchoolAlert[]> {
    return await db.select().from(missedSchoolAlerts)
      .orderBy(desc(missedSchoolAlerts.createdAt));
  }

  async getMissedSchoolAlertsBySession(sessionId: number): Promise<MissedSchoolAlert[]> {
    return await db.select().from(missedSchoolAlerts)
      .where(eq(missedSchoolAlerts.sessionId, sessionId))
      .orderBy(desc(missedSchoolAlerts.createdAt));
  }

  async createMissedSchoolAlert(insertAlert: InsertMissedSchoolAlert): Promise<MissedSchoolAlert> {
    const [alert] = await db.insert(missedSchoolAlerts).values(insertAlert).returning();
    return alert;
  }

  async updateMissedSchoolAlert(id: number, updates: Partial<MissedSchoolAlert>): Promise<MissedSchoolAlert> {
    const [alert] = await db.update(missedSchoolAlerts)
      .set(updates)
      .where(eq(missedSchoolAlerts.id, id))
      .returning();
    return alert;
  }

  // Student Absences
  async getStudentAbsences(): Promise<StudentAbsence[]> {
    const results = await db.select().from(studentAbsences).orderBy(desc(studentAbsences.createdAt));
    // Filter out any absences with invalid or null dates
    return results.filter(absence => 
      absence.absenceDate && 
      absence.absenceDate !== '' && 
      !isNaN(new Date(absence.absenceDate).getTime())
    );
  }

  async getStudentAbsencesByDate(date: string): Promise<StudentAbsence[]> {
    const results = await db.select().from(studentAbsences).where(eq(studentAbsences.absenceDate, date));
    // Filter out any absences with invalid or null dates
    return results.filter(absence => 
      absence.absenceDate && 
      absence.absenceDate !== '' && 
      !isNaN(new Date(absence.absenceDate).getTime())
    );
  }

  async getStudentAbsencesByStudent(studentId: number): Promise<StudentAbsence[]> {
    const results = await db.select().from(studentAbsences).where(eq(studentAbsences.studentId, studentId));
    // Filter out any absences with invalid or null dates
    return results.filter(absence => 
      absence.absenceDate && 
      absence.absenceDate !== '' && 
      !isNaN(new Date(absence.absenceDate).getTime())
    );
  }

  async createStudentAbsence(insertAbsence: InsertStudentAbsence): Promise<StudentAbsence> {
    const [created] = await db.insert(studentAbsences).values(insertAbsence).returning();
    return created;
  }

  async deleteStudentAbsence(id: number): Promise<void> {
    await db.delete(studentAbsences).where(eq(studentAbsences.id, id));
  }

  async checkStudentAbsence(studentId: number, date: string): Promise<boolean> {
    const result = await db
      .select()
      .from(studentAbsences)
      .where(and(
        eq(studentAbsences.studentId, studentId),
        eq(studentAbsences.absenceDate, date)
      ))
      .limit(1);
    return result.length > 0;
  }

  // GPS Route Tracking
  async createGpsRouteTrack(insertTrack: InsertGpsRouteTrack): Promise<GpsRouteTrack> {
    const [track] = await db.insert(gpsRouteTracks).values(insertTrack).returning();
    return track;
  }

  async getGpsRouteTracksBySession(sessionId: number): Promise<GpsRouteTrack[]> {
    return await db
      .select()
      .from(gpsRouteTracks)
      .where(eq(gpsRouteTracks.sessionId, sessionId))
      .orderBy(asc(gpsRouteTracks.timestamp));
  }

  async getGpsRouteTracksByDriver(driverId: number): Promise<GpsRouteTrack[]> {
    return await db
      .select()
      .from(gpsRouteTracks)
      .where(eq(gpsRouteTracks.driverId, driverId))
      .orderBy(desc(gpsRouteTracks.timestamp));
  }

  async updateGpsRouteTrack(id: number, updates: Partial<GpsRouteTrack>): Promise<GpsRouteTrack> {
    const [track] = await db
      .update(gpsRouteTracks)
      .set(updates)
      .where(eq(gpsRouteTracks.id, id))
      .returning();
    return track;
  }

  // GPS Route History
  async createGpsRouteHistory(insertHistory: InsertGpsRouteHistory): Promise<GpsRouteHistory> {
    const [history] = await db.insert(gpsRouteHistory).values(insertHistory).returning();
    return history;
  }

  async getGpsRouteHistory(): Promise<GpsRouteHistory[]> {
    return await db
      .select()
      .from(gpsRouteHistory)
      .orderBy(desc(gpsRouteHistory.startTime));
  }

  async getGpsRouteHistoryByDriver(driverId: number): Promise<GpsRouteHistory[]> {
    return await db
      .select()
      .from(gpsRouteHistory)
      .where(eq(gpsRouteHistory.driverId, driverId))
      .orderBy(desc(gpsRouteHistory.startTime));
  }

  async getGpsRouteHistoryBySession(sessionId: number): Promise<GpsRouteHistory | undefined> {
    const [history] = await db
      .select()
      .from(gpsRouteHistory)
      .where(eq(gpsRouteHistory.sessionId, sessionId));
    return history || undefined;
  }

  async updateGpsRouteHistory(id: number, updates: Partial<GpsRouteHistory>): Promise<GpsRouteHistory> {
    const [history] = await db
      .update(gpsRouteHistory)
      .set(updates)
      .where(eq(gpsRouteHistory.id, id))
      .returning();
    return history;
  }
}

export const storage = new DatabaseStorage();
