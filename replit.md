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