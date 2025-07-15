const { execSync } = require('child_process');

console.log('🚀 Starting Route Runner Mobile App...');
console.log('📱 Generating QR code for Expo Go...');
console.log('');

try {
  // Try to start expo with tunnel
  execSync('npx expo start --tunnel --non-interactive', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.log('Trying alternative method...');
  try {
    execSync('npm start', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error2) {
    console.log('Error starting server:', error2.message);
    console.log('');
    console.log('Try running these commands manually:');
    console.log('1. cd expo-mobile-app');
    console.log('2. npx expo start --tunnel');
  }
}