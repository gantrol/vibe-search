// Type definitions for vibe-search-gemini
// Minimal TypeScript declarations for consumers

export interface SearchWithGeminiOptions {
  content: string | string[];
  query: string;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  mode?: 'url' | 'text';
}

export interface SearchWithGeminiResult {
  answers: string[];
  raw: string;
}

export declare function searchWithGemini(options: SearchWithGeminiOptions): Promise<SearchWithGeminiResult>;
export default searchWithGemini;
