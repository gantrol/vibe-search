#!/usr/bin/env node

// Quick start script for the React example
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

console.log('🚀 Starting Vibe Search Gemini React Example...\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!existsSync(packageJsonPath)) {
  console.error('❌ Please run this script from the examples/react-app directory');
  console.log('   cd examples/react-app');
  console.log('   node start.js');
  process.exit(1);
}

try {
  // Check if node_modules exists
  if (!existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed!\n');
  }

  // Start the development server
  console.log('🌐 Starting development server...');
  console.log('   The app will open at http://localhost:3000');
  console.log('   Press Ctrl+C to stop the server\n');
  
  execSync('npm run dev', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Error starting the React app:', error.message);
  console.log('\n💡 Try running these commands manually:');
  console.log('   npm install');
  console.log('   npm run dev');
  process.exit(1);
}