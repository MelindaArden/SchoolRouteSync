export interface User {
  id: number;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface School {
  id: number;
  name: string;
  address: string;
  latitude?: string;
  longitude?: string;
  dismissalTime: string;
  contactPhone?: string;
  isActive: boolean;
}

export interface Route {
  id: number;
  name: string;
  driverId?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  grade: string;
  schoolId: number;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  isActive: boolean;
}

export interface PickupSession {
  id: number;
  routeId: number;
  driverId: number;
  date: string;
  status: string;
  startTime?: string;
  completedTime?: string;
  notes?: string;
}

export interface StudentPickup {
  id: number;
  sessionId: number;
  studentId: number;
  schoolId: number;
  pickedUpAt?: string;
  status: string;
  driverNotes?: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  recipientId?: number;
  sessionId?: number;
  studentId?: number;
  isRead: boolean;
  createdAt: string;
}
