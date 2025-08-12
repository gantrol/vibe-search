#!/usr/bin/env node

// Pre-release check script
import fs from 'fs';
import path from 'path';

console.log("🔍 Running pre-release checks...\n");

const checks = [];

// Check 1: package.json exists and has required fields
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredFields = ['name', 'version', 'description', 'main', 'exports', 'repository', 'license'];
  const missingFields = requiredFields.filter(field => !pkg[field]);
  
  if (missingFields.length === 0) {
    checks.push({ name: "package.json structure", status: "✓", message: "All required fields present" });
  } else {
    checks.push({ name: "package.json structure", status: "✗", message: `Missing fields: ${missingFields.join(', ')}` });
  }
} catch (error) {
  checks.push({ name: "package.json structure", status: "✗", message: "Cannot read package.json" });
}

// Check 2: Main entry file exists
const mainFile = 'src/index.js';
if (fs.existsSync(mainFile)) {
  checks.push({ name: "Main entry file", status: "✓", message: `${mainFile} exists` });
} else {
  checks.push({ name: "Main entry file", status: "✗", message: `${mainFile} not found` });
}

// Check 3: README files exist
const readmeFiles = ['README.md', 'README.zh-CN.md'];
readmeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    checks.push({ name: `${file}`, status: "✓", message: "Exists" });
  } else {
    checks.push({ name: `${file}`, status: "✗", message: "Missing" });
  }
});

// Check 4: LICENSE file exists
if (fs.existsSync('LICENSE')) {
  checks.push({ name: "LICENSE", status: "✓", message: "Exists" });
} else {
  checks.push({ name: "LICENSE", status: "✗", message: "Missing" });
}

// Check 5: Examples directory
if (fs.existsSync('examples') && fs.statSync('examples').isDirectory()) {
  const exampleFiles = fs.readdirSync('examples');
  checks.push({ name: "Examples", status: "✓", message: `${exampleFiles.length} example files` });
} else {
  checks.push({ name: "Examples", status: "✗", message: "Examples directory missing" });
}

// Check 6: .gitignore exists
if (fs.existsSync('.gitignore')) {
  checks.push({ name: ".gitignore", status: "✓", message: "Exists" });
} else {
  checks.push({ name: ".gitignore", status: "✗", message: "Missing" });
}

// Print results
console.log("Check Results:");
console.log("==============");
checks.forEach(check => {
  console.log(`${check.status} ${check.name}: ${check.message}`);
});

const failedChecks = checks.filter(check => check.status === "✗");
if (failedChecks.length === 0) {
  console.log("\n🎉 All checks passed! Package is ready for GitHub installation.");
  console.log("\nTo install this package:");
  console.log("npm install git+https://github.com/gantrol/vibe-search-gemini.git");
} else {
  console.log(`\n❌ ${failedChecks.length} checks failed. Please fix the issues above.`);
  process.exit(1);
}