# School Bus Route Management System - Map Feature Testing Guide

## Testing the Available Routes Tracker & Driver Route Recording

### Overview
The admin map feature provides comprehensive GPS tracking with real-time driver monitoring and 30-day historical route data. This guide helps verify that the system is properly recording and saving driver routes.

## Testing Environment Access

### Web Interface
- **URL**: Your Replit deployment URL
- **Admin Login**: `ma1313` / `Dietdew13!`
- **Business Name**: `tnt-gymnastics`
- **Driver Login**: `DeShaun` / `Password123`

### Mobile Interface Options
1. **Mobile Web**: Access the same URL on mobile browser
2. **Expo Go App**: Use QR code from Expo development server (if running)

### Master Admin Access (Full System)
- **Username**: `master-admin`
- **Password**: `MasterPass2024!`

## Step-by-Step Testing Instructions

### Phase 1: Verify Map Interface Access
1. **Login as Admin** (`ma1313` / `Dietdew13!` with business `tnt-gymnastics`)
2. **Navigate to Map Tab** - Click "Map" in the leadership dashboard navigation
3. **Verify Map Loads** - Should see admin map interface with route tracking capabilities
4. **Check Console Logs** - Open browser dev tools (F12) to monitor API calls and data loading

### Phase 2: Test Route Tracking System
1. **Check Existing Route Data**
   - Look for message: "Console logs show data loading correctly (2 routes with 22 GPS points each)"
   - Verify route cards display with driver information
   - Confirm GPS coordinates are showing properly (no JavaScript errors)

2. **Mobile Admin Map Test**
   - Access map on mobile device
   - Verify touch-friendly route cards work properly
   - Check GPS coordinate parsing (parseFloat() conversion should work)
   - Ensure no null safety errors in mobile browser

### Phase 3: Test Live Driver Route Recording
1. **Start Driver Session**
   - Login as driver (`DeShaun` / `Password123`)
   - Start a pickup route from driver dashboard
   - Allow GPS location access when prompted

2. **Monitor Real-time Tracking**
   - Switch to admin view while driver session is active
   - Navigate to Map tab
   - Look for active driver indicators (green pulsing dots)
   - Verify real-time GPS coordinates update every 30 seconds

3. **Verify Route Recording**
   - Check that GPS points are being saved to database
   - Observe route path visualization showing driver movement
   - Confirm timestamps are recorded with each GPS point

### Phase 4: Test Historical Route Data
1. **30-Day History Filter**
   - Use date filtering to view routes from different time periods
   - Verify "Today", "Yesterday", "This Week" groupings work
   - Check that older routes appear in historical data

2. **Route Detail Verification**
   - Click on route cards to see detailed information
   - Verify school stops, arrival times, and student pickup counts
   - Check GPS path data shows complete route tracking

### Phase 5: API Endpoint Testing

#### Test Route Maps API
```bash
# Replace YOUR_DOMAIN with your actual Replit deployment URL
curl "https://YOUR_DOMAIN/api/route-maps"
```
**Expected Response**: Array of route objects with GPS data, driver info, timestamps

#### Test Route Stops API
```bash
curl "https://YOUR_DOMAIN/api/route-stops"
```
**Expected Response**: School stop details with arrival times and coordinates

### Expected System Behavior

#### Active Route Tracking
- **Real-time Updates**: GPS locations refresh every 30 seconds during active sessions
- **Live Indicators**: Green pulsing dots show active drivers
- **Route Progress**: Visual progress indicators show completion status

#### Historical Data Storage
- **30-Day Retention**: System maintains complete route history for 30 days
- **GPS Point Storage**: Each route contains detailed GPS tracking points
- **School Stop Records**: Timestamps and coordinates for each school arrival

#### Data Structure Verification
Routes should contain:
- Driver identification and session information
- Start/end times with total duration calculations
- GPS coordinate arrays with precise timestamps
- School stop details with student pickup counts
- Route completion status and performance metrics

## Troubleshooting Common Issues

### Mobile GPS Issues
- **Permission Denied**: Ensure location access is granted in browser settings
- **Coordinate Errors**: Check that parseFloat() conversion is working for GPS data
- **Touch Interface**: Verify route cards are responsive on mobile devices

### Data Loading Problems
- **Empty Routes**: Check console for database connection errors
- **Missing GPS Points**: Verify driver started session with location enabled
- **API Failures**: Monitor network tab for failed requests to /api/route-maps

### Real-time Updates Not Working
- **WebSocket Connection**: Check for WebSocket errors in console
- **Refresh Intervals**: Verify 10-second refresh for active routes, 30-second for location updates
- **Session State**: Ensure driver session status is "in_progress" for live tracking

## Success Indicators

### Working Route Tracker Should Show:
✅ Admin map loads without JavaScript errors  
✅ Route cards display with driver and GPS information  
✅ Real-time active drivers appear with pulsing indicators  
✅ Historical routes organized by date categories  
✅ GPS coordinates display properly on mobile  
✅ Route details show school stops and timing  
✅ Database stores GPS points during active sessions  
✅ Map refreshes automatically with live data  

### Console Log Success Messages:
- "2 routes with 22 GPS points each" - indicates proper data loading
- No parseFloat() errors - GPS coordinate conversion working
- WebSocket connection established for real-time updates
- API calls returning 200 status for route data

## Performance Verification

The map system should demonstrate:
- **Immediate Loading**: Route data appears within 2-3 seconds
- **Smooth Navigation**: Touch-friendly interface on mobile
- **Real-time Accuracy**: Live GPS updates every 30 seconds
- **Historical Access**: Complete 30-day route archive
- **Data Integrity**: All GPS points and timestamps preserved

## Support Information

If issues are encountered:
1. Check browser console for specific error messages
2. Verify all credentials are entered correctly with proper business name
3. Ensure GPS location permissions are granted
4. Test both web and mobile interfaces for comparison
5. Monitor API response times and data structure

The system provides comprehensive route tracking with enterprise-grade GPS monitoring, real-time updates, and complete historical data retention for operational analysis and safety compliance.