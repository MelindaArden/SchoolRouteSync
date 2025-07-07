import { storage } from "./storage";
import { sendAdminNotifications } from "./notification-service";

interface DriverLocationData {
  lat: number;
  lng: number;
  timestamp: Date;
}

interface SchoolLocationData {
  lat: number;
  lng: number;
  name: string;
  expectedTime: string;
  alertThreshold: number; // minutes before expected time to alert
}

// Calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Check if driver is within reasonable distance of school (within 1 km)
function isDriverNearSchool(driverLat: number, driverLng: number, schoolLat: number, schoolLng: number): boolean {
  const distance = calculateDistance(driverLat, driverLng, schoolLat, schoolLng);
  return distance <= 1.0; // Within 1 kilometer
}

// Parse time string (HH:MM) and create Date object for today
function parseTimeToday(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export async function checkMissedSchools() {
  try {
    // Get all active pickup sessions for today
    const today = new Date().toISOString().split('T')[0];
    const allSessions = await storage.getPickupSessionsToday();
    const activeSessions = allSessions.filter(session => session.status === 'in_progress');

    for (const session of activeSessions) {
      // Get route schools for this session
      const routeSchools = await storage.getRouteSchools(session.routeId);
      
      // Get driver's latest location
      const driverLocations = await storage.getDriverLocationsBySession(session.id);
      if (driverLocations.length === 0) continue;
      
      const latestLocation = driverLocations[0]; // Most recent location
      const driverLat = parseFloat(latestLocation.latitude);
      const driverLng = parseFloat(latestLocation.longitude);
      
      for (const routeSchool of routeSchools) {
        // Get school details
        const school = await storage.getSchool(routeSchool.schoolId);
        if (!school || !school.latitude || !school.longitude) continue;
        
        const schoolLat = parseFloat(school.latitude);
        const schoolLng = parseFloat(school.longitude);
        const expectedTime = parseTimeToday(routeSchool.estimatedArrivalTime);
        const alertThreshold = routeSchool.alertThresholdMinutes || 10;
        const alertTime = new Date(expectedTime.getTime() - (alertThreshold * 60 * 1000));
        
        const now = new Date();
        
        // Check if we're past the alert time but before expected arrival
        if (now >= alertTime && now <= expectedTime) {
          // Check if driver is near the school
          const isNearSchool = isDriverNearSchool(driverLat, driverLng, schoolLat, schoolLng);
          
          if (!isNearSchool) {
            // Check if we've already sent this alert
            const existingAlerts = await storage.getMissedSchoolAlertsBySession(session.id);
            const alreadyAlerted = existingAlerts.some(alert => 
              alert.routeSchoolId === routeSchool.id && 
              alert.alertType === 'late_arrival' &&
              alert.alertSent
            );
            
            if (!alreadyAlerted) {
              // Create missed school alert
              const alert = await storage.createMissedSchoolAlert({
                sessionId: session.id,
                routeSchoolId: routeSchool.id,
                driverId: session.driverId,
                alertType: 'late_arrival',
                expectedTime: routeSchool.estimatedArrivalTime,
                actualTime: now,
                driverLocation: JSON.stringify({
                  lat: driverLat,
                  lng: driverLng,
                  timestamp: latestLocation.timestamp
                }),
                alertSent: false,
                emailSent: false
              });
              
              // Send notification to admins
              await sendMissedSchoolNotification(alert, session, school, false);
              
              // Mark alert as sent
              await storage.updateMissedSchoolAlert(alert.id, {
                alertSent: true,
                emailSent: true
              });
            }
          }
        }
        
        // Check if we're past expected arrival time and driver still not at school
        if (now > expectedTime) {
          const isNearSchool = isDriverNearSchool(driverLat, driverLng, schoolLat, schoolLng);
          
          if (!isNearSchool) {
            // Check if we've already sent missed school alert
            const existingAlerts = await storage.getMissedSchoolAlertsBySession(session.id);
            const alreadyAlerted = existingAlerts.some(alert => 
              alert.routeSchoolId === routeSchool.id && 
              alert.alertType === 'missed_school' &&
              alert.alertSent
            );
            
            if (!alreadyAlerted) {
              // Create missed school alert
              const alert = await storage.createMissedSchoolAlert({
                sessionId: session.id,
                routeSchoolId: routeSchool.id,
                driverId: session.driverId,
                alertType: 'missed_school',
                expectedTime: routeSchool.estimatedArrivalTime,
                actualTime: now,
                driverLocation: JSON.stringify({
                  lat: driverLat,
                  lng: driverLng,
                  timestamp: latestLocation.timestamp
                }),
                alertSent: false,
                emailSent: false
              });
              
              // Send urgent notification to admins
              await sendMissedSchoolNotification(alert, session, school, true);
              
              // Mark alert as sent
              await storage.updateMissedSchoolAlert(alert.id, {
                alertSent: true,
                emailSent: true
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking missed schools:', error);
  }
}

async function sendMissedSchoolNotification(alert: any, session: any, school: any, urgent = false) {
  const driver = await storage.getUser(session.driverId);
  const route = await storage.getRoute(session.routeId);
  
  const alertTypeText = alert.alertType === 'missed_school' ? 'MISSED SCHOOL' : 'LATE ARRIVAL WARNING';
  const priorityLevel = urgent ? 'urgent' : 'high';
  
  const title = `${alertTypeText}: ${school.name}`;
  const message = `Driver ${driver?.firstName} ${driver?.lastName} on ${route?.name} is ${alert.alertType === 'missed_school' ? 'missing pickup at' : 'running late for'} ${school.name}. Expected: ${alert.expectedTime}, Current time: ${new Date().toLocaleTimeString()}.`;
  
  // Send admin notifications using the existing notification service
  await sendAdminNotifications({
    type: 'emergency',
    title,
    message,
    driverId: session.driverId,
    sessionId: session.id,
    priority: priorityLevel as 'low' | 'medium' | 'high' | 'urgent',
    timezone: 'America/New_York' // Default to Eastern Time for US school operations
  });
  
  console.log(`🚨 MISSED SCHOOL ALERT: ${alertTypeText} - ${school.name} - Driver: ${driver?.firstName} ${driver?.lastName}`);
}

// Start monitoring service - check every 2 minutes
export function startMissedSchoolMonitoring() {
  console.log('🔍 Starting missed school monitoring service...');
  
  // Initial check
  checkMissedSchools();
  
  // Check every 2 minutes (120,000 ms)
  setInterval(checkMissedSchools, 120000);
}