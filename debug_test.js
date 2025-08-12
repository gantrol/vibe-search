import "dotenv/config";
import { searchWithGemini } from "./src/index.js";

async function test() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error("Need API key");
    process.exit(1);
  }

  const result = await searchWithGemini({
    content: ["StrawbeRry"],
    query: "R,r",
    apiKey
  });

  console.log("Gemini result:", result.answers);
  console.log("Raw response:", result.raw);
  
  // Test the evaluation logic
  const truth = ["r", "R", "r"];
  console.log("Truth:", truth);
  
  // Simulate the multiset logic
  function multisetFromList(list) {
    const map = new Map();
    for (const x of list) map.set(x, (map.get(x) || 0) + 1);
    return map;
  }

  function prfForText(pred, truth) {
    const predM = multisetFromList(pred);
    const truthM = multisetFromList(truth);
    let tp = 0, predCount = 0, truthCount = 0;
    predM.forEach((cnt, token) => { predCount += cnt; });
    truthM.forEach((cnt, token) => { truthCount += cnt; });
    predM.forEach((pc, token) => {
      const tc = truthM.get(token) || 0;
      tp += Math.min(pc, tc);
    });
    const precision = predCount ? tp / predCount : 0;
    const recall = truthCount ? tp / truthCount : 0;
    const f1 = (precision + recall) ? (2 * precision * recall) / (precision + recall) : 0;
    return { precision, recall, f1, tp, predCount, truthCount };
  }

  const metrics = prfForText(result.answers, truth);
  console.log("Metrics:", metrics);
}

test().catch(console.error);