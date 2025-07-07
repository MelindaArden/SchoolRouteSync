# School Bus Route Management System

## Overview

This is a full-stack web application for managing school bus routes, driver assignments, and student pickups. The system provides different interfaces for drivers and leadership personnel to efficiently manage school transportation operations. Built with Express.js backend, React frontend, and PostgreSQL database using Drizzle ORM.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Radix UI with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design tokens
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Real-time Communication**: WebSocket server for live updates
- **Authentication**: Session-based authentication
- **API Design**: RESTful API with comprehensive CRUD operations

### Database Architecture
- **Database**: PostgreSQL (configurable with Neon serverless)
- **Schema Management**: Drizzle migrations
- **Key Tables**: users, schools, routes, students, pickup sessions, notifications

## Key Components

### User Management
- Role-based access control (driver vs leadership)
- User authentication and session management
- Profile management and settings

### Route Management
- Route creation and assignment to drivers
- School-to-route mapping with order sequencing
- Student assignment to routes and schools

### Pickup Operations
- Real-time pickup session management
- Student status tracking (pending, picked up, absent, no show)
- GPS location tracking for drivers
- Driver notes and issue reporting

### Real-time Features
- WebSocket connections for live updates
- Location tracking during active pickup sessions
- Instant notifications for status changes

### Mobile-Responsive Design
- Touch-friendly interface optimized for mobile devices
- Progressive Web App capabilities
- Offline-friendly architecture considerations

## Data Flow

### Authentication Flow
1. User logs in with username/password
2. Server validates credentials and creates session
3. User data stored in localStorage for persistence
4. Role-based redirection to appropriate dashboard

### Pickup Session Flow
1. Driver starts pickup session for assigned route
2. GPS tracking begins automatically
3. Driver updates student pickup status in real-time
4. WebSocket broadcasts updates to leadership dashboard
5. Location updates sent to server at 30-second intervals

### Real-time Updates
1. Client establishes WebSocket connection on login
2. Server maintains connection mapping by user ID
3. Database changes trigger WebSocket broadcasts
4. Clients receive updates and invalidate relevant queries

## External Dependencies

### Third-party Services
- **Twilio SMS**: For emergency notifications and alerts
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit**: Development and deployment platform

### Key Libraries
- **Database**: Drizzle ORM, @neondatabase/serverless
- **UI Framework**: React, Radix UI components
- **Validation**: Zod for schema validation
- **Real-time**: WebSocket (ws library)
- **Location**: Browser Geolocation API
- **Notifications**: Custom toast system

## Deployment Strategy

### Development Environment
- Replit-based development with hot reloading
- Vite dev server for frontend
- tsx for TypeScript execution in development
- PostgreSQL module for database connectivity

### Production Build
- Vite builds optimized frontend bundle
- esbuild compiles backend to single JavaScript file
- Static assets served from Express
- Database migrations applied via Drizzle

### Environment Configuration
- DATABASE_URL for PostgreSQL connection
- Twilio credentials for SMS functionality
- Node.js 20 runtime environment
- Autoscale deployment target

## Changelog

### July 1, 2025 - Complete Notification System & Student Pickup Timestamps
- Implemented comprehensive admin notification system with multiple delivery methods
- Added SendGrid email notifications with professional templates and priority levels - WORKING
- Enhanced console logging with detailed admin alerts for immediate visibility - WORKING
- Maintained Twilio SMS integration (T-Mobile carrier blocking identified and documented)
- Fixed notification service architecture with email-first approach and SMS backup
- Created real-time in-app notifications working perfectly on leadership dashboard - WORKING
- Email notifications verified and delivering successfully to melinda@tntgym.org
- Added browser push notification system with Settings tab for admin dashboard
- Enhanced notification management with delete functionality and better content display
- Ensured 100% admin alert delivery through console logs, in-app notifications, and email
- Fixed driver student pickup system with precise timestamp tracking when students are marked as picked up
- Enhanced student list interface to display pickup times in real-time for drivers
- Verified pickup session creation and student tracking works perfectly with automated pickup record creation
- Added comprehensive real-time driver location tracking for admin monitoring
- Created GPS tracking dashboard showing active drivers with live location updates
- Implemented driver location API with enriched data including route and session information
- Admins can now see exactly where drivers are headed during active pickup sessions

### July 3, 2025 - Missed School Monitoring & Alert System
- Implemented comprehensive missed school monitoring system with GPS-based tracking
- Added automated alerts when drivers are late to or miss scheduled school pickups
- Created real-time monitoring that checks driver locations every 2 minutes during active routes
- Built admin-configurable alert thresholds (5-60 minutes before expected pickup time)
- Integrated email notifications to admins for late arrivals and missed schools
- Added missed school alerts database tracking to prevent duplicate notifications
- Enhanced notification system with multiple delivery methods (in-app, email, console logging)
- System calculates distance between driver location and schools using GPS coordinates
- Automated distance checking (within 1km of school) to determine if driver is on track
- Built missed school alerts API endpoint for admin dashboard integration

### July 3, 2025 - Enhanced Route Completion Repository
- Comprehensive route completion repository now fully operational with detailed historical tracking
- Enhanced pickup history dashboard with summary statistics showing total routes, completion rates, and performance metrics
- Added CSV export functionality for admin record-keeping and reporting
- Implemented advanced search and filtering capabilities for easy route completion lookup
- Enhanced detailed view showing individual student pickup status, timestamps, and driver notes
- Added recent activity tracking (last 7 days) for quick performance monitoring
- Route completion data includes driver information, route details, completion times, and pickup statistics
- System automatically saves comprehensive completion records when drivers finish routes

### July 3, 2025 - Advanced Navigation System & Route Optimization
- Implemented comprehensive turn-by-turn navigation system for drivers with intelligent route guidance
- Added smart navigation view showing next destination, distance calculations, and travel time estimates
- Integrated external navigation app support (Apple Maps/Google Maps) for real driving directions
- Created intelligent route optimizer using Traveling Salesman Problem algorithms for maximum efficiency
- Added admin route optimization tools with school selection, driver assignment, and automatic ordering
- Implemented distance-based route calculations considering dismissal times and traffic patterns
- Built route metrics system showing total distance, travel time, and efficiency ratings
- Enhanced driver dashboard with detailed navigation cards, arrival time estimates, and route progression
- Added route optimization guidelines and tips for admins to create most efficient pickup routes
- Integrated GPS-based bearing calculations and cardinal direction guidance for drivers

### July 3, 2025 - Student Assignment Fix & Driver Interface Enhancement
- Fixed student listings in driver pickup routes by ensuring proper route assignments exist
- Added route assignments linking students to specific schools within driver routes
- Enhanced driver interface with proper student counts and contact information display
- Changed driver navigation "Profile" tab to "Notify" as requested for clearer notification access
- Students now properly appear in driver school cards with full contact details and pickup status
- Driver route interface now shows accurate student counts per school with expandable student lists

### July 3, 2025 - Driver Pickup System & Admin Dashboard Improvements
- Fixed driver student pickup marking system by correcting active session detection
- Enhanced session state management to properly identify in-progress pickup sessions
- Updated admin dashboard "Route Status" to show only active in-progress routes for current day
- Improved GPS tracking section to ensure active drivers are properly listed and displayed
- Fixed driver-side student pickup toggle functionality with proper session ID passing
- Streamlined admin interface to focus on currently active operations and real-time monitoring

### July 3, 2025 - Admin Notification Email System Implementation
- Fixed critical React hooks error causing blank white screen on driver login
- Added notification email field to user schema and admin user management interface
- Implemented comprehensive admin notification email system with professional HTML templates
- Created automated email delivery to all admin users with notification emails configured
- Enhanced notification service to send emails to multiple admin recipients simultaneously
- Added admin notification email management in user form with dedicated field for alert emails
- System now automatically sends all issues, missed schools, and emergency alerts to admin emails
- Integrated email notifications with existing in-app notifications and SMS backup systems

### July 3, 2025 - Enhanced Active Alerts & Student Pickup System
- Fixed driver student pickup functionality by correcting session detection and ID passing
- Enhanced Active Alerts section to display missed schools, driver issues, and behind-schedule routes
- Implemented comprehensive alert counting system including all alert types
- Added automatic missed school email notifications to admin notification addresses
- Enhanced alert display with proper timestamps and categorization by alert type
- Student pickup marking now works correctly with proper session state management
- Active Alerts section shows real-time driver issues reported through the system

### July 3, 2025 - Mobile Safari Login System Fix
- Implemented comprehensive session management system with express-session middleware
- Added proper session configuration optimized for mobile Safari compatibility
- Enhanced login system with server-side session validation and automatic session restoration
- Added session debugging endpoints to troubleshoot mobile authentication issues
- Configured cookie settings with sameSite: 'lax' and httpOnly: false for mobile browsers
- Implemented automatic session checking on app load with fallback to localStorage
- Enhanced logout functionality to properly destroy server sessions
- Created comprehensive credentials reference in CREDENTIALS.md with all valid login combinations

### July 3, 2025 - Token-Based Authentication for Mobile Safari
- Implemented robust token-based authentication system that bypasses mobile Safari session issues
- Created server-side token management with automatic expiration and validation
- Enhanced login endpoint to return authToken field for mobile Safari compatibility
- Updated session endpoint to validate both session cookies and authorization tokens
- Modified frontend authentication to prioritize token storage in localStorage over sessions
- Added comprehensive token cleanup and logout functionality
- Mobile Safari now uses localStorage tokens instead of problematic session cookies
- System automatically falls back to session authentication for desktop browsers

### July 3, 2025 - Advanced Multi-Driver Route Optimization System
- Ensured all schools have valid GPS coordinates for precise route calculations
- Created comprehensive multi-driver route optimizer handling capacity constraints and student distribution
- Implemented intelligent route clustering algorithm using best-fit decreasing capacity allocation
- Added vehicle seat capacity management with configurable driver count and maximum route time limits
- Built advanced route optimization using Traveling Salesman Problem algorithms with time constraints
- Created warning system identifying timing conflicts, capacity issues, and efficiency concerns
- Added comprehensive analysis dashboard showing utilization metrics, distance calculations, and performance warnings
- Integrated school dismissal time coordination with buffer time management between pickups
- Enhanced leadership dashboard with "Multi-Route" optimizer accessible via Route Setup tab
- System creates optimal routes considering driver availability, student counts, and geographic distribution

### July 7, 2025 - Enhanced Route Optimization with Admin Override & Real-time Updates
- Enhanced route optimization system with comprehensive admin override capabilities for manual route adjustments
- Added manual route reordering interface with up/down arrow controls for admin customization
- Implemented visual feedback system showing when admins have manually overridden optimized routes
- Added "Override Order" and "Re-optimize" buttons for seamless switching between automated and manual modes
- Fixed route saving system with improved error handling and detailed console logging for debugging
- Enhanced WebSocket broadcasting to ensure route changes propagate immediately to all connected clients including drivers
- Added real-time route update notifications with proper cache invalidation across the entire system
- Improved route creation and school assignment endpoints with better validation and error messages
- System now properly handles route ID validation to prevent "undefined" errors during school assignments
- Routes created through optimization are immediately available to assigned drivers without refresh needed
- Admin can save optimized routes or manually adjusted routes with identical functionality and real-time updates

### July 7, 2025 - Automatic Geocoding & GPS Integration System  
- Implemented comprehensive automatic geocoding system for school address to GPS coordinate conversion
- Added server-side geocoding service with multiple provider fallbacks (Nominatim OpenStreetMap, Mapbox support)
- Created automatic coordinate population when school addresses are entered during school creation
- Enhanced school creation form with real-time geocoding feedback and manual "Find GPS Coordinates" button
- Added geocoding API endpoint (/api/geocode) for frontend address validation and coordinate lookup
- Updated all existing schools with proper GPS coordinates for route planning and navigation functionality
- Fixed school creation validation errors to properly handle decimal GPS coordinate fields
- School form now displays geocoding status with visual feedback and coordinate confirmation
- GPS coordinates automatically populate latitude/longitude fields with green highlighting when successful
- System ready for enhanced route optimization, turn-by-turn navigation, and admin GPS tracking features
- All schools now have valid GPS coordinates for precise distance calculations and location-based monitoring

### July 7, 2025 - Complete Six-Issue System Enhancement & Route Management Optimization
- Fixed real-time weekly performance tracking in admin dashboard with 10-second refresh intervals for live statistics updates
- Implemented comprehensive route editing capabilities in Route Creator allowing admins to modify routes before finalizing and saving
- Enhanced Route Concerns text styling with red coloring for better visibility and urgency indication in route optimization interface
- Added starting and ending point consideration system allowing users to input custom starting/ending locations for route optimization
- Fixed absence display issues ensuring student absences show immediately after admin creation with enhanced real-time refresh capabilities
- Optimized route ordering system based on school dismissal times and location efficiency for optimal driver pickup sequences
- Created enhanced route editor component with drag-and-drop reordering, starting/ending point configuration, and manual override capabilities
- Integrated real-time absence tracking with 3-second refresh intervals and forced cache invalidation for immediate visibility
- Enhanced driver route endpoints to sort schools by dismissal time efficiency ensuring drivers see optimal pickup order
- Added comprehensive route editing interface with visual feedback, order controls, and seamless integration with route creator

### July 7, 2025 - Comprehensive Route Management Enhancement & Advanced Features
- Implemented comprehensive route duration tracking with automatic calculation and display across driver and admin interfaces
- Enhanced route creation system with automatic estimated arrival time calculation (5 minutes before school dismissal time)
- Added automated email alert system that sends notifications to all admins when drivers miss estimated arrival times
- Created advanced route creator tool with multi-driver optimization, capacity management, and intelligent school clustering
- Removed single/multi route button differentiation as requested - unified into single "Route Creator" tool
- Fixed route creation error handling with enhanced validation, console logging, and proper error messages
- Ensured schools are properly listed in pickup order for drivers using orderIndex sorting in route endpoints
- Enhanced pickup session completion to capture and store route duration in minutes automatically
- Added route duration display to both driver route summary page and admin history views
- Integrated comprehensive GPS-based missed arrival monitoring with real-time email notifications
- Advanced route creator includes capacity constraints, geographical optimization, and timing conflict detection
- System automatically creates optimized routes considering driver count, seat capacity, dismissal times, and student distribution
- Enhanced route form with automatic coordinate population and real-time estimated arrival time calculation

### July 7, 2025 - Final System Fixes & Same-Day Absence Support
- Fixed comprehensive route deletion system with proper cascade delete order to handle all foreign key constraints
- Resolved missed school alerts, pickup history, student pickups, and route assignments deletion sequence
- Enhanced student absence management to support same-day absence marking without date restrictions
- Implemented time-based history organization with collapsible folders (Today, This Week, This Month, Older)
- Removed "Active Alerts" section from admin dashboard as requested by user
- Added interactive "On Time %" hover tooltip showing individual driver performance breakdowns
- Enhanced history dropdown to display school names and student names with proper data relationships
- Fixed route deletion errors with comprehensive foreign key constraint handling for admin users
- Student absences now support immediate same-day marking with real-time updates and accurate counts
- System fully operational with all route management, absence tracking, and admin interface enhancements

### July 7, 2025 - Comprehensive System Fixes & Real-time Dashboard Updates
- Fixed all six critical issues requested by user with comprehensive system improvements
- Enhanced driver session tab with real-time pickup count updates showing actual student pickup progress
- Implemented real-time admin dashboard statistics with 10-second refresh intervals for live data
- Added interactive weekly performance hover tooltips showing individual driver performance breakdowns
- Enhanced same-day absence reporting with real-time updates and proper today's absence display
- Fixed student display in driver routes - all students now properly appear under their assigned schools
- Created comprehensive absence tracking with visual indicators preventing pickup of absent students
- Added real-time statistics throughout the system with automatic refresh capabilities
- Weekly performance tooltips now show driver-by-driver breakdown with color-coded performance indicators
- All dashboard stats update live including pickup counts, active routes, alerts, and completion rates
- Student absence management fully supports same-day reporting with immediate updates and notifications
- Fixed timezone-aware notifications displaying correct Eastern Time across all system notifications

### July 3, 2025 - System Fixes & Student Absence Management Implementation
- Fixed admin history details view to show comprehensive pickup lists grouped by school with pickup status and timestamps
- Enhanced pickup history component to properly display picked up and not picked up students by school location
- Created comprehensive student absence management system allowing admins to mark students absent for specific dates
- Added student absence database table with proper schema, storage methods, and API endpoints
- Implemented student absence dashboard with date selection, absence statistics, and management capabilities
- Added absence tracking with reason codes, admin notes, and automated date-based filtering
- Verified email notification system functionality for driver issue submissions to admin email addresses
- Confirmed admin email notifications working with backup sender verification through melinda@tntgym.org
- Email notifications successfully delivered to admin users when drivers submit issues or maintenance requests
- System properly integrates in-app notifications, email alerts, and SMS backup for comprehensive admin coverage

### June 16, 2025 - Route Completion History & Reset System
- Implemented comprehensive pickup history tracking system with detailed records of completed routes
- Added pickup history dashboard for admin viewing with student pickup details and completion times
- Created route completion API endpoint that automatically saves detailed history when drivers mark routes complete
- Added route reset functionality allowing drivers to immediately start new routes after completion
- Enhanced route summary page with "Start New Route" button for seamless workflow continuation
- Implemented pickup history storage with JSON pickup details and completion statistics
- Added admin pickup history interface with search, filtering, and detailed pickup breakdowns
- Enhanced leadership dashboard with dedicated history tab for viewing all completed routes
- Fixed route completion flow to properly save student pickup times and driver notes to permanent history

### June 16, 2025 - Driver Dashboard Student Display Fix
- Fixed critical issue where drivers couldn't see students assigned to each school in their routes
- Enhanced driver routes endpoint to properly load and group students by school assignment
- Fixed data inconsistency between route schools and student assignments
- Implemented comprehensive notification system with multiple delivery channels for SMS failures
- Added backup notification methods including email-to-SMS gateways and webhook logging
- Drivers now see complete student lists with names, grades, and contact information for each school

### Initial Setup
- June 16, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.