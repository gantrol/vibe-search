#!/usr/bin/env node

// Test script to verify the package works after installation
// Usage: node examples/install-test.js

import { searchWithGemini } from "vibe-search-gemini";

console.log("🧪 Testing vibe-search-gemini package installation...\n");

// Test 1: Function availability
console.log("✓ Package imported successfully");
console.log("✓ searchWithGemini function available:", typeof searchWithGemini === 'function');

// Test 2: Basic parameter validation
try {
  await searchWithGemini({});
} catch (error) {
  if (error.message.includes("Missing")) {
    console.log("✓ Parameter validation working correctly");
  } else {
    console.log("✗ Unexpected validation error:", error.message);
  }
}

// Test 3: Content normalization
try {
  await searchWithGemini({
    content: ["test1", "test2"],
    query: "test",
    apiKey: "fake-key"
  });
} catch (error) {
  if (error.message.includes("API") || error.message.includes("fetch")) {
    console.log("✓ Content processing working (API error expected with fake key)");
  } else {
    console.log("✗ Content processing error:", error.message);
  }
}

console.log("\n🎉 Package installation test completed!");
console.log("\nTo use with a real API key:");
console.log("GEMINI_API_KEY=your_key node examples/run.js");