# Vibe Search Gemini - React Example

This is a React web application demonstrating how to use the `vibe-search-gemini` package in a frontend environment.

## Features

- 🔍 Interactive search interface
- 📝 Sample content presets
- 🎨 Clean, responsive UI
- 🔒 Secure API key handling
- 📊 Real-time search results
- 🌐 Bilingual support (English/Chinese)

## Prerequisites

- Node.js 18+ 
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Setup

1. **Navigate to the React app directory:**
   ```bash
   cd examples/react-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional):**
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   The app will automatically open at `http://localhost:3000`

## Usage

1. **Enter your Gemini API key** in the first field
2. **Add content to search within** - you can use the sample content buttons for quick testing
3. **Enter your search query** - what you're looking for
4. **Click Search** and wait for AI-powered results

## Sample Content

The app includes three preset content types:

- **Tech Resources**: Links to popular development tools and documentation
- **Learning Sites**: Educational platforms and resources
- **中文示例**: Chinese technology company websites

## API Key Security

⚠️ **Important**: This is a demo application. In production:

- Never expose API keys in client-side code
- Use environment variables on the server
- Implement proper authentication
- Consider using a backend proxy for API calls

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### Common Issues

1. **"Missing apiKey" error**
   - Make sure you've entered a valid Gemini API key
   - Check that your API key has proper permissions

2. **Network errors**
   - Verify your internet connection
   - Check if your API key has sufficient quota

3. **No results found**
   - Try different search queries
   - Make sure your content contains relevant information

### Development

If you're modifying the code:

```bash
# Install dependencies in the main package
cd ../../
npm install

# Link the package locally
cd examples/react-app
npm install
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **vibe-search-gemini** - AI search functionality
- **CSS3** - Styling and animations

## License

This example is part of the vibe-search-gemini package and follows the same MIT license.