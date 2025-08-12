# vibe-search

[![中文文档](https://img.shields.io/badge/文档-中文-blue.svg)](README.zh-CN.md)

LLM vibe search: a Node.js library that uses Google Gemini to find relevant websites directly from your provided content.

## Install

### NPM

```bash
npm i vibe-search
```

### From GitHub

```bash
# Install directly from GitHub
npm install git+https://github.com/gantrol/vibe-search.git

# Or with a specific branch/tag
npm install git+https://github.com/gantrol/vibe-search.git#main

# Or using yarn
yarn add git+https://github.com/gantrol/vibe-search.git
```

### For Development

```bash
# Clone and install dependencies
git clone https://github.com/gantrol/vibe-search.git
cd vibe-search
npm install
```

## Quick start

The library exposes `searchWithGemini({ content, query, apiKey, model? })`.

### API Reference

- **Inputs**
  - `content: string | string[]` — the corpus to search within
  - `query: string` — the search query
  - `apiKey: string` — your Gemini API key
  - `model?: string` — model name (default: `gemini-2.5-flash`)
  - `maxTokens?: number` — max output tokens (default: 2048)
- **Output**
  - `{ answers: string[], raw: string }`

### Basic Usage

```js
import { searchWithGemini } from "vibe-search";

const { answers, raw } = await searchWithGemini({
  content: [
    "Node.js: https://nodejs.org/en/",
    "Google AI Studio: https://aistudio.google.com/",
  ],
  query: "Extract all occurrences of 'R' or 'r' from 'StrawbeRry'",
  apiKey: process.env.GEMINI_API_KEY,
});
console.log(answers);
```

### Test Installation

After installing the package, you can test it works:

```bash
# Test the package installation
node examples/install-test.js

# Run the full example (requires API key)
GEMINI_API_KEY=your_key node examples/run.js
```

Run the example script:

```powershell
# Windows PowerShell
$env:GEMINI_API_KEY = "<your-key>"; node examples/run.js
```

### React Example

A complete React web application example is available:

```bash
# Navigate to React example
cd examples/react-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The React app provides an interactive interface for testing the search functionality with sample content and real-time results.

## Evaluation

An evaluation script is provided to compute common IR metrics:
- Precision, Recall, F1
- MAP, MRR, nDCG@k

It supports a baseline dry run (no API calls), JSON datasets, basic caching, and concurrency.

```powershell
# Dry run (fast):
node examples/evaluate.js --dry --dataset examples/dataset.sample.json --k 5 --concurrency 2

# Real model (text-only):
$env:GEMINI_API_KEY = "<your-key>"; node examples/evaluate.js --dataset examples/dataset.sample.json --k 5 --concurrency 2 --model gemini-2.5-flash
```

Datasets:
- `examples/dataset.sample.json` — small bilingual sample
- `examples/dataset.complex.json` — larger, edge-case-heavy set

CLI flags:
- `--dataset <path>` pick a dataset file (JSON array)
- `--k <n>` cutoff depth for metrics
- `--model <name>` Gemini model to use
- `--concurrency <n>` parallelism
- `--dry` use heuristic baseline (no API)
- `--nocache` bypass cache; `--saveRaw` persist raw LLM outputs

## API

Function: `searchWithGemini(options)`
- options
  - `content: string | string[]`
  - `query: string`
  - `apiKey: string`
  - `model?: string` (default `gemini-2.5-flash`)
  - `maxTokens?: number` (default 2048)
- returns
  - `{ sites: { url: string, title?: string, score: number, evidence?: string }[], raw: string }`

Notes:
- The function prefers URLs found in your content; if none are present, it may propose plausible links with low scores.
- If the model returns non-JSON, the library attempts to recover and falls back to regex URL extraction.

## Requirements

- Node.js 18+ recommended
- A valid Gemini API key and active billing
- Dependency: `@google/genai`
