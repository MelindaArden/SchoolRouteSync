#!/bin/bash

echo "🚀 Starting Route Runner Mobile App..."
echo "📱 Make sure you have Expo Go installed on your phone"
echo ""
echo "Starting development server..."
echo ""

cd expo-mobile-app

# Try different methods to start expo
if command -v expo &> /dev/null; then
    echo "Using global expo CLI..."
    expo start --tunnel
elif command -v npx &> /dev/null; then
    echo "Using npx expo..."
    npx expo start --tunnel
else
    echo "Using npm start..."
    npm start
fi