# 📱 Mobile App Setup Instructions

## Quick Start

1. **Install Expo CLI globally**:
   ```bash
   npm install -g @expo/cli
   ```

2. **Navigate to mobile app directory**:
   ```bash
   cd expo-mobile-app
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npx expo start
   ```

5. **View on your device**:
   - Install "Expo Go" app from App Store/Google Play
   - Scan the QR code shown in your terminal
   - Or press `w` to open in web browser

## Login Credentials
- Admin: `ma1313` / `Dietdew13!`
- Admin: `ChadW` / `Password123`
- Driver: `DeShaun` / `Password123`

## Features Available

### For Drivers:
- View assigned routes
- Start/stop pickup sessions
- Mark students as picked up/absent
- GPS tracking during routes
- Report issues

### For Admins:
- Complete dashboard overview
- Route management
- Driver monitoring
- Issue handling
- Performance analytics
- Real-time notifications

## Troubleshooting

### If installation fails:
```bash
npm install --legacy-peer-deps
```

### If Expo not found:
```bash
npm install -g expo-cli@latest
```

### Alternative - Web Preview:
Open in browser mobile view:
https://e537d7f5-b883-43fe-b64c-44c5c6138301-00-3ipw3bmo8u42i.janeway.replit.dev

## API Connection
The app automatically connects to your backend:
- Development: `http://localhost:5000`
- Production: Your Replit URL (already configured)

## Next Steps
1. Test login with existing credentials
2. Try driver route management
3. Test admin dashboard features
4. Configure push notifications (optional)

The mobile app provides the same functionality as your web dashboard with enhanced mobile features like native GPS tracking and push notifications.