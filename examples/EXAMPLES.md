# Examples Guide

This directory contains various examples demonstrating how to use the `vibe-search-gemini` package.

## Available Examples

### 1. Basic Node.js Example (`run.js`)
Simple command-line example showing basic usage.

```bash
GEMINI_API_KEY=your_key node examples/run.js
```

### 2. Installation Test (`install-test.js`)
Verifies the package installation and basic functionality.

```bash
node examples/install-test.js
```

### 3. React Web Application (`react-app/`)
Complete React web application with interactive UI.

```bash
# Quick start
cd examples/react-app
node start.js

# Or manual setup
cd examples/react-app
npm install
npm run dev
```

### 4. Evaluation Script (`evaluate.js`)
Advanced evaluation with metrics and datasets.

```bash
# Dry run (no API calls)
node examples/evaluate.js --dry --dataset examples/dataset.sample.json

# With real API
GEMINI_API_KEY=your_key node examples/evaluate.js --dataset examples/dataset.sample.json
```

## Testing Examples

Run all example tests:

```bash
# Test basic installation
npm run test:install

# Test React example setup
npm run test:react

# Run pre-release checks
npm run check
```

## Getting API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Set it as environment variable:
   ```bash
   # Windows PowerShell
   $env:GEMINI_API_KEY = "your-api-key"
   
   # Linux/macOS
   export GEMINI_API_KEY="your-api-key"
   ```

## Common Issues

### "Missing apiKey" Error
- Make sure you've set the `GEMINI_API_KEY` environment variable
- Verify the API key is valid and has proper permissions

### React Example Not Starting
- Ensure you're in the `examples/react-app` directory
- Run `npm install` first
- Check Node.js version (requires 18+)

### Import Errors
- Make sure the package is properly installed
- For local development, run `npm install` in the root directory first

## File Structure

```
examples/
├── run.js                 # Basic Node.js example
├── install-test.js        # Installation verification
├── evaluate.js           # Evaluation script
├── test-react-example.js  # React example test
├── dataset.sample.json   # Sample dataset
├── dataset.complex.json  # Complex dataset
├── react-app/            # React web application
│   ├── src/
│   │   ├── App.jsx       # Main React component
│   │   ├── main.jsx      # React entry point
│   │   └── index.css     # Styles
│   ├── package.json      # React app dependencies
│   ├── vite.config.js    # Vite configuration
│   ├── start.js          # Quick start script
│   └── README.md         # React app documentation
└── EXAMPLES.md           # This file
```

## Contributing

When adding new examples:

1. Create clear, focused examples
2. Include proper error handling
3. Add documentation
4. Test with both valid and invalid inputs
5. Update this guide