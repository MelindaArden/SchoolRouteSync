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