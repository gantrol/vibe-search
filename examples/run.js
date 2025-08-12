import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { searchWithGemini } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.API_KEY || process.argv[2];
  if (!apiKey) {
    console.error("Usage: GEMINI_API_KEY=<key> node examples/run.js <optional-key>\nAlso accepts API key as first CLI arg.");
    process.exit(1);
  }

  const content = [
    "Here are some useful sites about Node.js and Google Gemini:",
    "- Node.js official website: https://nodejs.org/en/",
    "- Google AI Studio: https://aistudio.google.com/",
    "- @google/genai GitHub: https://github.com/google-gemini/generative-ai-js"
  ];

  const query = "如何用 @google/genai 调用 Gemini 搜索相关资料？";

  const { sites, raw } = await searchWithGemini({ content, query, apiKey });
  console.log("Sites:\n", sites);
  console.log("\nRaw:\n", raw);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
