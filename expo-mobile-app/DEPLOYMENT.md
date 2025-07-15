# Route Runner Mobile App - Deployment Guide

## Overview
This is the native mobile version of Route Runner built with Expo React Native. It connects to your existing Express.js backend and provides native mobile capabilities for both drivers and administrators.

## Prerequisites

### 1. Install Required Tools
```bash
# Install Node.js (if not already installed)
# Install Expo CLI globally
npm install -g @expo/cli

# Install EAS CLI for building and deployment
npm install -g eas-cli
```

### 2. Setup Expo Account
1. Visit [expo.dev](https://expo.dev) and create a free account
2. Login via CLI: `expo login`

## Quick Start (Development)

### 1. Navigate to Mobile App Directory
```bash
cd expo-mobile-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm start
```

This will open Expo DevTools in your browser. You can then:
- Scan QR code with Expo Go app (iOS/Android)
- Press `i` for iOS simulator
- Press `a` for Android emulator

## Production Deployment

### 1. Configure EAS Build
```bash
# Initialize EAS in your project
eas build:configure
```

### 2. Build for App Stores

#### For iOS (App Store)
```bash
eas build --platform ios --profile production
```

#### For Android (Google Play Store)
```bash
eas build --platform android --profile production
```

#### For Both Platforms
```bash
eas build --platform all --profile production
```

### 3. Submit to App Stores

#### iOS App Store
```bash
eas submit --platform ios
```

#### Google Play Store
```bash
eas submit --platform android
```

## Alternative: Expo Go Development

### For Quick Testing (No Build Required)
1. Install Expo Go app on your phone
2. Run `npm start` in the expo-mobile-app directory
3. Scan the QR code with your phone
4. The app will load directly in Expo Go

## App Features

### Driver Features
- ✅ Login with existing credentials (ChadW/Password123, DeShaun/Password123)
- ✅ View assigned routes and student lists
- ✅ Real-time GPS tracking during routes
- ✅ Mark students as picked up/absent
- ✅ Submit issues and maintenance requests
- ✅ Receive push notifications

### Admin Features  
- ✅ Login with admin credentials (ma1313/Dietdew13!)
- ✅ Monitor all active routes in real-time
- ✅ View driver locations and status
- ✅ Manage routes and student assignments
- ✅ View reports and analytics
- ✅ Handle driver issues and notifications

## Backend Integration

The mobile app connects to your existing Route Runner backend:
- **Development:** http://localhost:5000
- **Production:** https://e537d7f5-b883-43fe-b64c-44c5c6138301-00-3ipw3bmo8u42i.janeway.replit.dev

All API endpoints, authentication, and data are shared between web and mobile versions.

## App Store Information

### App Details
- **Name:** Route Runner
- **Bundle ID:** com.routerunner.app
- **Version:** 1.0.0
- **Category:** Education/Transportation

### Required Assets
- App Icon (1024×1024 px)
- Splash Screen
- Screenshots for App Store listings
- App Store description and keywords

## Testing Credentials

Use the same credentials as the web app:
- **Admin:** ma1313 / Dietdew13!
- **Driver:** ChadW / Password123
- **Driver:** DeShaun / Password123

## Support

For deployment assistance:
1. Check Expo documentation: [docs.expo.dev](https://docs.expo.dev)
2. EAS Build documentation: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction)
3. App Store submission guides: [docs.expo.dev/submit/introduction](https://docs.expo.dev/submit/introduction)