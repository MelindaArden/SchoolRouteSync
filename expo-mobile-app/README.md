# School Bus Driver Mobile App

A React Native Expo app for school bus drivers and administrators to manage pickup routes and track students.

## Features

### For Drivers
- **Route Management**: View assigned routes and start pickup sessions
- **GPS Tracking**: Automatic location tracking during active routes
- **Student Management**: Mark students as picked up, absent, or no-show
- **Real-time Updates**: Live synchronization with the backend system
- **Issue Reporting**: Report mechanical, weather, or emergency issues
- **Push Notifications**: Receive important updates and alerts

### For Administrators
- **Dashboard Overview**: View active routes, driver status, and statistics
- **Route Management**: Create, edit, and delete pickup routes
- **Driver Monitoring**: Track active drivers and their locations
- **Issue Management**: Handle reported issues and maintenance requests
- **Analytics**: View pickup completion rates and performance metrics
- **Notifications**: Manage and receive system-wide alerts

## Technical Architecture

### Frontend (React Native/Expo)
- **Authentication**: Secure token-based authentication with your existing backend
- **Location Services**: Native GPS tracking with background location support
- **Push Notifications**: Real-time notification delivery
- **Offline Support**: Cached data for limited offline functionality
- **Navigation**: React Navigation for smooth screen transitions

### Backend Integration
- **API Connection**: Connects to your existing Express.js backend
- **Real-time Sync**: WebSocket support for live updates
- **Data Consistency**: Seamless integration with your PostgreSQL database
- **Authentication**: Uses your existing user authentication system

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd expo-mobile-app
   npm install
   ```

2. **Configure API Endpoint**
   - Update `src/config/api.ts` with your backend URL
   - Development: `http://localhost:5000`
   - Production: Your deployed Replit URL

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Run on Device/Simulator**
   - Install Expo Go app on your mobile device
   - Scan QR code from terminal
   - Or use iOS Simulator / Android Emulator

## Configuration

### API Configuration
The app connects to your existing Express.js backend. Update the API base URL in:
- `expo-mobile-app/src/config/api.ts`

### Authentication
Uses your existing authentication system:
- Login credentials: Same as web dashboard
- Token-based authentication for mobile compatibility
- Secure storage using Expo SecureStore

### Permissions
Required permissions:
- **Location**: For GPS tracking during routes
- **Notifications**: For route updates and alerts
- **Background Processing**: For location tracking

## Deployment

### Testing
1. Test with Expo Go app during development
2. Use your existing user credentials (ma1313/Dietdew13!, etc.)
3. Verify API connectivity with your backend

### Production Build
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

### App Store Distribution
1. Create developer accounts (Apple App Store / Google Play)
2. Follow Expo's deployment guides
3. Submit builds for review

## Features Integration

### Connects to Your Existing System
- ✅ Uses your current user database
- ✅ Integrates with existing routes and schools
- ✅ Maintains pickup session history
- ✅ Connects to notification system
- ✅ Preserves all admin functionality

### Mobile-Specific Enhancements
- 🔄 Better GPS accuracy than web browsers
- 📱 Native push notifications
- 📲 Offline route data caching
- 🎯 Touch-optimized interface
- 🔋 Battery-efficient location tracking

## User Experience

### Driver Workflow
1. Login with existing credentials
2. View assigned routes
3. Start route (begins GPS tracking)
4. Navigate through schools
5. Mark students picked up/absent
6. Complete route and stop tracking

### Admin Workflow
1. Login with admin credentials
2. View dashboard with live statistics
3. Monitor active drivers and routes
4. Manage route assignments
5. Handle reported issues
6. View analytics and reports

## Support

For technical support or questions:
- Contact your school transportation administrator
- Check with your IT department for deployment assistance
- Use existing support channels for user credential issues

## Notes

- **Dual Platform Support**: Both web dashboard and mobile app available
- **Role-Based Access**: Automatically shows driver or admin interface
- **Data Synchronization**: Real-time updates across all platforms
- **Existing Workflow**: Minimal changes to current processes
- **Enhanced Mobility**: Full admin functionality available on mobile devices