#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting Route Runner Mobile App...');
console.log('📱 Make sure you have Expo Go installed on your phone');
console.log('');

// Change to expo-mobile-app directory
process.chdir(path.join(process.cwd(), 'expo-mobile-app'));

// Start expo development server
const expo = spawn('npx', ['expo', 'start', '--tunnel'], {
  stdio: 'inherit',
  shell: true
});

expo.on('close', (code) => {
  console.log(`\n📱 Expo development server exited with code ${code}`);
});

expo.on('error', (error) => {
  console.error('❌ Error starting Expo:', error.message);
  console.log('\n💡 Try running this command manually:');
  console.log('   cd expo-mobile-app');
  console.log('   npx expo start');
});