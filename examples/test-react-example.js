#!/usr/bin/env node

// Test script to verify the React example setup
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing React example setup...\n');

const reactAppDir = path.join(process.cwd(), 'examples', 'react-app');
const checks = [];

// Check 1: React app directory exists
if (fs.existsSync(reactAppDir)) {
  checks.push({ name: "React app directory", status: "✓", message: "exists" });
} else {
  checks.push({ name: "React app directory", status: "✗", message: "missing" });
}

// Check 2: package.json exists
const packageJsonPath = path.join(reactAppDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.dependencies && pkg.dependencies['vibe-search-gemini']) {
      checks.push({ name: "package.json", status: "✓", message: "has vibe-search-gemini dependency" });
    } else {
      checks.push({ name: "package.json", status: "✗", message: "missing vibe-search-gemini dependency" });
    }
  } catch (error) {
    checks.push({ name: "package.json", status: "✗", message: "invalid JSON" });
  }
} else {
  checks.push({ name: "package.json", status: "✗", message: "missing" });
}

// Check 3: Main React files exist
const requiredFiles = [
  'src/App.jsx',
  'src/main.jsx',
  'src/index.css',
  'index.html',
  'vite.config.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(reactAppDir, file);
  if (fs.existsSync(filePath)) {
    checks.push({ name: file, status: "✓", message: "exists" });
  } else {
    checks.push({ name: file, status: "✗", message: "missing" });
  }
});

// Check 4: App.jsx imports vibe-search-gemini
const appJsxPath = path.join(reactAppDir, 'src', 'App.jsx');
if (fs.existsSync(appJsxPath)) {
  const appContent = fs.readFileSync(appJsxPath, 'utf8');
  if (appContent.includes("from 'vibe-search-gemini'")) {
    checks.push({ name: "App.jsx import", status: "✓", message: "imports vibe-search-gemini" });
  } else {
    checks.push({ name: "App.jsx import", status: "✗", message: "missing vibe-search-gemini import" });
  }
}

// Print results
console.log("Check Results:");
console.log("==============");
checks.forEach(check => {
  console.log(`${check.status} ${check.name}: ${check.message}`);
});

const failedChecks = checks.filter(check => check.status === "✗");
if (failedChecks.length === 0) {
  console.log("\n🎉 React example setup is complete!");
  console.log("\nTo run the React example:");
  console.log("1. cd examples/react-app");
  console.log("2. npm install");
  console.log("3. npm run dev");
  console.log("\nOr use the quick start script:");
  console.log("   node examples/react-app/start.js");
} else {
  console.log(`\n❌ ${failedChecks.length} checks failed. Please fix the issues above.`);
  process.exit(1);
}