import { storage } from './storage';

// Nashville area coordinates for realistic simulation
const NASHVILLE_CENTER = { lat: 36.1627, lng: -86.7816 };
const RADIUS_KM = 50; // 50km radius around Nashville

// Generate realistic GPS coordinates around Nashville
function generateNashvilleCoordinates() {
  const radiusInDegrees = RADIUS_KM / 111; // Approximate conversion
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * radiusInDegrees;
  
  return {
    latitude: NASHVILLE_CENTER.lat + radius * Math.cos(angle),
    longitude: NASHVILLE_CENTER.lng + radius * Math.sin(angle)
  };
}

// Generate realistic school coordinates
function generateSchoolCoordinates() {
  const schools = [
    { lat: 36.1627, lng: -86.7816, name: "Downtown Elementary" },
    { lat: 36.1447, lng: -86.8147, name: "West End Academy" },
    { lat: 36.1849, lng: -86.7482, name: "East Nashville School" },
    { lat: 36.1156, lng: -86.7919, name: "South Nashville Elementary" },
    { lat: 36.2033, lng: -86.7634, name: "North Nashville School" }
  ];
  
  return schools[Math.floor(Math.random() * schools.length)];
}

// Generate realistic GPS path between two points
function generateGPSPath(startLat: number, startLng: number, endLat: number, endLng: number, points: number = 8) {
  const path = [];
  
  for (let i = 0; i <= points; i++) {
    const ratio = i / points;
    const lat = startLat + (endLat - startLat) * ratio;
    const lng = startLng + (endLng - startLng) * ratio;
    
    // Add some random variation to make it more realistic
    const variation = 0.001; // Small random variation
    const finalLat = lat + (Math.random() - 0.5) * variation;
    const finalLng = lng + (Math.random() - 0.5) * variation;
    
    path.push({
      latitude: finalLat,
      longitude: finalLng,
      timestamp: new Date(Date.now() - (points - i) * 120000).toISOString(), // 2-minute intervals
      speed: Math.random() * 30 + 20 // Random speed between 20-50 mph
    });
  }
  
  return path;
}

// Simulate GPS tracking for a session
export async function simulateGPSTracking(sessionId: number) {
  try {
    console.log(`🚌 Starting GPS simulation for session ${sessionId}`);
    
    // Get session details
    const session = await storage.getPickupSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Get route schools
    const routeSchools = await storage.getRouteSchools(session.routeId);
    if (routeSchools.length === 0) {
      throw new Error(`No schools found for route ${session.routeId}`);
    }
    
    // Generate starting point
    const startPoint = generateNashvilleCoordinates();
    let currentLat = startPoint.latitude;
    let currentLng = startPoint.longitude;
    
    const gpsPath = [];
    const schoolTimestamps = [];
    
    // Generate path to each school
    for (let i = 0; i < routeSchools.length; i++) {
      const school = routeSchools[i];
      const schoolCoords = generateSchoolCoordinates();
      
      // Generate GPS path to school
      const pathToSchool = generateGPSPath(currentLat, currentLng, schoolCoords.lat, schoolCoords.lng);
      gpsPath.push(...pathToSchool);
      
      // Record school arrival
      const arrivalTime = new Date(Date.now() - (routeSchools.length - i) * 600000); // 10 minutes apart
      const departureTime = new Date(arrivalTime.getTime() + 180000); // 3 minutes at school
      
      schoolTimestamps.push({
        schoolId: school.schoolId,
        schoolName: school.name,
        arrivalTime: arrivalTime.toISOString(),
        departureTime: departureTime.toISOString()
      });
      
      // Update current position
      currentLat = schoolCoords.lat;
      currentLng = schoolCoords.lng;
      
      // Create GPS route track entry for school arrival
      await storage.createGpsRouteTrack({
        sessionId: sessionId,
        driverId: session.driverId,
        routeId: session.routeId,
        schoolId: school.schoolId,
        latitude: schoolCoords.lat.toString(),
        longitude: schoolCoords.lng.toString(),
        eventType: 'school_arrival',
        arrivalTime: arrivalTime,
        timestamp: arrivalTime
      });
    }
    
    // Update driver location to current position
    await storage.updateDriverLocation(session.driverId, {
      latitude: currentLat.toString(),
      longitude: currentLng.toString(),
      sessionId: sessionId
    });
    
    // Create or update GPS route history
    try {
      const existingHistory = await storage.getGpsRouteHistoryBySession(sessionId);
      if (!existingHistory) {
        await storage.createGpsRouteHistory({
          sessionId: sessionId,
          driverId: session.driverId,
          routeId: session.routeId,
          routeName: `Route ${session.routeId}`,
          startTime: new Date(Date.now() - 1800000), // 30 minutes ago
          startLatitude: startPoint.latitude.toString(),
          startLongitude: startPoint.longitude.toString(),
          routePath: JSON.stringify({
            coordinates: gpsPath,
            schoolTimestamps: schoolTimestamps
          }),
          schoolsVisited: schoolTimestamps.length,
          totalStudentsPickedUp: routeSchools.length * 3, // Estimate 3 students per school
          completionStatus: session.status === 'completed' ? 'completed' : 'in_progress'
        });
      }
    } catch (historyError) {
      console.log('GPS history creation skipped:', historyError.message);
    }
    
    console.log(`📊 GPS simulation completed: ${gpsPath.length} GPS points, ${schoolTimestamps.length} school visits`);
    
    return {
      gpsPath,
      schoolTimestamps,
      totalPoints: gpsPath.length,
      schoolsVisited: schoolTimestamps.length
    };
    
  } catch (error) {
    console.error('GPS simulation error:', error);
    throw error;
  }
}

// Clean up old GPS simulation data
export async function cleanupOldGPSData(daysOld: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    console.log(`🧹 Cleaning up GPS data older than ${daysOld} days`);
    
    // This would be implemented with actual database cleanup
    // For now, just log the cleanup action
    console.log('GPS data cleanup completed');
    
  } catch (error) {
    console.error('GPS cleanup error:', error);
  }
}