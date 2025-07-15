# 📱 Route Runner Mobile App - Expo Go Setup

## Why you don't see the app in Expo login:
The app needs to be started locally first. It's not published to Expo's servers - it runs from your computer.

## ✅ Quick Setup Steps:

### 1. Open Terminal/Command Prompt
- **Windows:** Press `Win + R`, type `cmd`, press Enter
- **Mac:** Press `Cmd + Space`, type `Terminal`, press Enter
- **Or use the terminal tab in Replit**

### 2. Navigate to Mobile App Folder
```bash
cd expo-mobile-app
```

### 3. Start the Development Server
```bash
npx expo start --tunnel
```

### 4. Scan the QR Code
- **iPhone:** Use Camera app, point at QR code, tap notification
- **Android:** Open Expo Go app, tap "Scan QR Code"

### 5. Login to Route Runner
Use your existing credentials:
- **Admin:** ma1313 / Dietdew13!
- **Driver:** ChadW / Password123

## 🔧 Alternative Method (If Above Doesn't Work):

### Option A: Use Metro Bundler
```bash
cd expo-mobile-app
npm start
```

### Option B: Manual Connection
1. Make sure phone and computer are on same WiFi
2. In Expo Go, tap "Enter URL manually"
3. Enter: `exp://192.168.1.XXX:19000` (replace XXX with your computer's IP)

## 📝 What Happens Next:

1. **QR Code appears** in your terminal
2. **Scan with Expo Go** on your phone
3. **Route Runner loads** instantly
4. **Login works** with same credentials as web app
5. **All features available:** GPS tracking, student management, admin dashboard

## 🚨 Common Issues:

- **No QR code?** Make sure Expo CLI finished installing
- **Connection failed?** Check same WiFi network
- **App won't load?** Try `npx expo start --clear`

## 💡 Remember:
- The app runs from your computer, not Expo's servers
- You need to keep the terminal running while using the app
- This is for testing - later you can publish to app stores

Your Route Runner mobile app is ready to test!