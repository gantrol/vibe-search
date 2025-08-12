# vibe-search Usage Guide

## Installation

```bash
npm install vibe-search
```

## Basic Usage

### 1. Import the library

```js
import { searchWithGemini } from "vibe-search";
```

### 2. Prepare the API Key

Get a Gemini API Key: https://aistudio.google.com/apikey

```js
// Option A: Environment variable (recommended)
const apiKey = process.env.GEMINI_API_KEY;

// Option B: Pass directly (not recommended for production)
const apiKey = "your-api-key-here";
```

### 3. Perform a search

```js
const result = await searchWithGemini({
  content: [
    "Node.js official website: https://nodejs.org/",
    "Google AI Studio: https://aistudio.google.com/",
    "GitHub repository: https://github.com/google-gemini/generative-ai-js"
  ],
  query: "How to use the Gemini API?",
  apiKey: apiKey
});

console.log("Answers:", result.answers);
console.log("Raw response:", result.raw);
```

## Advanced Usage

### Custom model

```js
const result = await searchWithGemini({
  content: "your content",
  query: "your search query",
  apiKey: apiKey,
  model: "gemini-2.5-flash",  // default model
  maxTokens: 4096              // maximum output tokens
});
```

### Handling large content

```js
const largeContent = [
  "Document 1 content...",
  "Document 2 content...",
  "Document 3 content..."
];

const result = await searchWithGemini({
  content: largeContent,  // will be concatenated into a single string automatically
  query: "Find specific information",
  apiKey: apiKey
});
```

### Error handling

```js
try {
  const result = await searchWithGemini({
    content: "content",
    query: "query",
    apiKey: apiKey
  });
  console.log(result.answers);
} catch (error) {
  if (error.message.includes("Missing")) {
    console.error("Missing parameter:", error.message);
  } else if (error.message.includes("API")) {
    console.error("API call failed:", error.message);
  } else {
    console.error("Unknown error:", error.message);
  }
}
```

## Full Example

```js
import { searchWithGemini } from "vibe-search";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Please set the GEMINI_API_KEY environment variable");
    process.exit(1);
  }

  const content = [
    "Tech doc: React is a JavaScript library for building UIs",
    "Official website: https://reactjs.org/",
    "Learning resources: https://react.dev/learn",
    "GitHub: https://github.com/facebook/react"
  ];

  try {
    const result = await searchWithGemini({
      content,
      query: "React learning resources",
      apiKey,
      model: "gemini-2.5-flash"
    });

    console.log("Answers:");
    result.answers.forEach((answer, index) => {
      console.log(`${index + 1}. ${answer}`);
    });

  } catch (error) {
    console.error("Search failed:", error.message);
  }
}

main();
```

## Environment Variables

### Windows PowerShell
```powershell
$env:GEMINI_API_KEY = "your-api-key"
node your-script.js
```

### Windows CMD
```cmd
set GEMINI_API_KEY=your-api-key
node your-script.js
```

### Linux/macOS
```bash
export GEMINI_API_KEY=your-api-key
node your-script.js
```

### .env file

Create a `.env` file:
```
GEMINI_API_KEY=your-api-key
```

Then in your code:
```js
import dotenv from "dotenv";
dotenv.config();
```

## Troubleshooting

### Common errors

1. **"Missing apiKey"**
   - Ensure the API key is set
   - Verify the environment variable name

2. **"Missing content"**
   - Ensure the `content` parameter is provided
   - `content` must not be an empty string or empty array

3. **"Missing query"**
   - Ensure the `query` parameter is provided
   - `query` must not be an empty string

4. **API call failed**
   - Check network connectivity
   - Verify the API key is valid
   - Ensure you have sufficient quota

### Debugging tips

1. Log the raw model output:
```js
const result = await searchWithGemini({
  // ... other params
});
console.log("Raw response:", result.raw);
```

2. Test an API key quickly:
```js
try {
  const result = await searchWithGemini({
    content: "test",
    query: "test",
    apiKey: "your-key"
  });
  console.log("API key works");
} catch (error) {
  console.log("API key issue:", error.message);
}
```

## More Examples

See the `examples/` directory:
- `examples/run.js` - Basic usage example
- `examples/evaluate.js` - Evaluation script
- `examples/install-test.js` - Installation test
