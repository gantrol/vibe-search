// vibe-search-gemini: LLM-based extraction over provided content using Google Gemini (text-only)
// Contract:
//   input: { content: string | string[], query: string, apiKey: string, model?: string }
//   output: { answers: string[], raw: string }
//   Error modes: throws on missing apiKey/query/content, or upstream API failure.

import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash";

function normalizeContent(content) {
  if (Array.isArray(content)) return content.filter(Boolean).join("\n\n");
  return String(content ?? "");
}

function buildTextPrompt({ corpus, query }) {
  return `You are a careful extractor. Given the corpus and a query describing what to extract, return JSON only with:
{
  "answers": ["..."]
}

Examples:
Corpus: ABcabCB
Query: B,c
Expected JSON: { "answers": ["B","c","C"] }

User Query: ${query}
---
Corpus:
${corpus}
---`;
}

export async function searchWithGemini({ content, query, apiKey, model = DEFAULT_MODEL, maxTokens = 2048, mode = 'url' } = {}) {
  if (!apiKey) throw new Error("Missing apiKey");
  if (!query) throw new Error("Missing query");
  if (!content) throw new Error("Missing content");

  const corpus = normalizeContent(content);
  const ai = new GoogleGenAI({ apiKey });

  const prompt = buildTextPrompt({ corpus, query });

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.2,
    },
  });

  const text = typeof response?.text === "function" ? response.text() : (response?.text ?? "");

  let parsed = { answers: [] };
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const maybe = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
    parsed = JSON.parse(maybe);
  } catch (_) {
    // Fallback: naive tokenization by commas/spaces
  const tokens = String(query).split(/[;,\s]+/).filter(Boolean);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alt = tokens.length ? `(${tokens.map(esc).join('|')})` : '';
  const re = alt ? new RegExp(alt, 'g') : null;
  const found = [];
  if (re) { let m; while ((m = re.exec(corpus)) && found.length < 200) { found.push(m[0]); } }
  parsed = { answers: found };
  }

  const answers = Array.isArray(parsed?.answers) ? parsed.answers.filter(x => typeof x === 'string' && x.length > 0) : [];
  return { answers, raw: text };
}

export default { searchWithGemini };
