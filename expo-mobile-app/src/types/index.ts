// Types matching your existing backend schema
export interface User {
  id: number;
  username: string;
  role: 'driver' | 'leadership';
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

export interface School {
  id: number;
  name: string;
  address: string;
  dismissalTime: string;
  latitude?: string;
  longitude?: string;
  isActive: boolean;
}

export interface Route {
  id: number;
  name: string;
  driverId: number;
  startingAddress?: string;
  endingAddress?: string;
  estimatedDuration?: number;
  isActive: boolean;
}

export interface RouteSchool {
  id: number;
  routeId: number;
  schoolId: number;
  orderIndex: number;
  estimatedArrival?: string;
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  grade: string;
  schoolId: number;
  parentPhone?: string;
  emergencyContact?: string;
  notes?: string;
  isActive: boolean;
}

export interface PickupSession {
  id: number;
  routeId: number;
  driverId: number;
  status: 'pending' | 'in_progress' | 'completed';
  startTime?: string;
  endTime?: string;
  startLatitude?: string;
  startLongitude?: string;
  endLatitude?: string;
  endLongitude?: string;
  duration?: number;
  notes?: string;
  date: string;
}

export interface StudentPickup {
  id: number;
  sessionId: number;
  studentId: number;
  schoolId: number;
  status: 'pending' | 'picked_up' | 'no_show' | 'absent';
  pickupTime?: string;
  notes?: string;
}

export interface DriverLocation {
  id: number;
  driverId: number;
  sessionId?: number;
  latitude: string;
  longitude: string;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface Issue {
  id: number;
  driverId: number;
  type: 'mechanical' | 'weather' | 'traffic' | 'emergency' | 'maintenance' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  reportedAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: 'info' | 'warning' | 'error' | 'success' | 'emergency';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  RouteDetail: { routeId: number };
  StudentList: { schoolId: number; sessionId: number };
  Settings: undefined;
  Notifications: undefined;
};

// Location types
export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}