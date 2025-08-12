# vibe-search-gemini

LLM “card-draw” search: a Node.js library that uses Google Gemini to find relevant websites directly from your provided content.

## Install

```powershell
# In the project root
npm i
```

## Quick start

The library exposes `searchWithGemini({ content, query, apiKey, model? })`.

- Inputs
  - content: string | string[] — the corpus to search within
  - query: string — the search query
  - apiKey: string — your Gemini API key
  - model?: string — model name (default: `gemini-2.5-flash`)
- Output
  - `{ sites: Array<{ url, title?, score, evidence? }>, raw }`

Example:

```js
import { searchWithGemini } from "./src/index.js";

const { sites, raw } = await searchWithGemini({
  content: [
    "Node.js: https://nodejs.org/en/",
    "Google AI Studio: https://aistudio.google.com/",
  ],
  query: "Where can I learn Node.js and Gemini?",
  apiKey: process.env.GEMINI_API_KEY,
});
console.log(sites);
```

Run the example script:

```powershell
# Windows PowerShell
$env:GEMINI_API_KEY = "<your-key>"; node examples/run.js
```

## Evaluation

An evaluation script is provided to compute common IR metrics:
- Precision, Recall, F1
- MAP, MRR, nDCG@k

It supports a baseline dry run (no API calls), JSON datasets, basic caching, and concurrency.

```powershell
# Dry run (fast):
node examples/evaluate.js --dry --dataset examples/dataset.sample.json --k 5 --concurrency 2

# Real model:
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

## Related

For Chinese documentation, see `README.zh-CN.md`.
