// Enhanced evaluation harness for LLM search.
// Features:
// - Metrics: Precision/Recall/F1, MAP, MRR, nDCG@k
// - Dataset loading from JSON file
// - Caching of model responses
// - Concurrency control
// - --dry mode (no API call) using a simple heuristic baseline
// - CLI options without extra deps

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { searchWithGemini } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = { k: 10, dataset: path.join(__dirname, "dataset.sample.json"), concurrency: 2, model: undefined, nocache: false, saveRaw: false, dry: false };
  const isFlag = (s) => typeof s === 'string' && s.startsWith('--');
  const nextVal = (i) => (i + 1 < argv.length && !isFlag(argv[i + 1])) ? argv[i + 1] : undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dataset") {
      const v = nextVal(i);
      if (v) { args.dataset = path.resolve(v); i++; } else { console.warn("[Args] --dataset requires a path; using default:", args.dataset); }
      continue;
    }
    if (a === "--k") {
      const v = nextVal(i);
      if (v) { const n = parseInt(v, 10); if (!Number.isNaN(n)) args.k = Math.max(1, n); i++; } else { console.warn("[Args] --k requires a number; using:", args.k); }
      continue;
    }
    if (a === "--concurrency") {
      const v = nextVal(i);
      if (v) { const n = parseInt(v, 10); if (!Number.isNaN(n)) args.concurrency = Math.max(1, n); i++; } else { console.warn("[Args] --concurrency requires a number; using:", args.concurrency); }
      continue;
    }
    if (a === "--model") {
      const v = nextVal(i);
      if (v) { args.model = v; i++; } else { console.warn("[Args] --model requires a value; using default model"); }
      continue;
    }
    if (a === "--nocache") { args.nocache = true; continue; }
    if (a === "--saveRaw") { args.saveRaw = true; continue; }
    if (a === "--dry") { args.dry = true; continue; }
  }
  return args;
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function readJSON(p, fallback) { try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return fallback; } }
function writeJSON(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8"); }

function uniqueOrder(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    if (!seen.has(x)) { seen.add(x); out.push(x); }
  }
  return out;
}

// Metrics (multiset-aware for text tasks)
function precisionRecallF1(pred, truth) {
  // Kept for reference; not used in text mode where duplicates matter.
  const setPred = new Set(pred);
  const setTruth = new Set(truth);
  let tp = 0; setPred.forEach((x) => { if (setTruth.has(x)) tp++; });
  const fp = Math.max(0, setPred.size - tp);
  const fn = Math.max(0, setTruth.size - tp);
  const precision = setPred.size ? tp / setPred.size : 0;
  const recall = setTruth.size ? tp / setTruth.size : 0;
  const f1 = (precision + recall) ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1, tp, fp, fn };
}

function averagePrecisionMS(pred, truth) {
  // Multiset AP: each prediction counts only up to remaining truth multiplicity.
  const rem = new Map();
  let truthCount = 0;
  for (const t of truth) { rem.set(t, (rem.get(t) || 0) + 1); truthCount++; }
  if (!truthCount) return 0;
  let hits = 0; let sumPrec = 0;
  for (let i = 0; i < pred.length; i++) {
    const p = pred[i];
    const cnt = rem.get(p) || 0;
    if (cnt > 0) {
      hits++;
      sumPrec += hits / (i + 1);
      rem.set(p, cnt - 1);
    }
  }
  return sumPrec / truthCount;
}

function reciprocalRankMS(pred, truth) {
  const rem = new Map();
  for (const t of truth) rem.set(t, (rem.get(t) || 0) + 1);
  for (let i = 0; i < pred.length; i++) {
    const p = pred[i];
    const cnt = rem.get(p) || 0;
    if (cnt > 0) return 1 / (i + 1);
  }
  return 0;
}

function ndcgAtKMS(pred, truth, k = pred.length) {
  const rem = new Map();
  let truthCount = 0;
  for (const t of truth) { rem.set(t, (rem.get(t) || 0) + 1); truthCount++; }
  if (!truthCount) return 0;
  const gains = [];
  for (let i = 0; i < Math.min(k, pred.length); i++) {
    const p = pred[i];
    const cnt = rem.get(p) || 0;
    if (cnt > 0) { gains.push(1); rem.set(p, cnt - 1); } else { gains.push(0); }
  }
  const dcg = gains.reduce((acc, g, i) => acc + (g / Math.log2(i + 2)), 0);
  const idealOnes = Math.min(k, truthCount);
  const ideal = Array(idealOnes).fill(1).reduce((acc, g, i) => acc + (g / Math.log2(i + 2)), 0);
  return ideal > 0 ? dcg / ideal : 0;
}

// Simple hashing for cache keys (djb2)
function djb2(str) {
  let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

async function baselineSearch({ content, query, k }) {
  // Heuristic: find exact tokens listed in query.
  const text = Array.isArray(content) ? content.join("\n") : String(content || "");
  const tokens = String(query || "").split(/[;,\s]+/).filter(Boolean);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alt = tokens.length ? `(${tokens.map(esc).join('|')})` : '';
  const re = alt ? new RegExp(alt, 'g') : null;
  const found = [];
  if (re) { let m; while ((m = re.exec(text)) && found.length < k) { found.push(m[0]); } }
  return { answers: found };
}

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

async function runOne({ item, apiKey, model, k, cacheDir, useCache, saveRaw, dry }) {
  const keyObj = { c: item.content, q: item.query, m: model, k, v: 'text-v3' };
  const key = djb2(JSON.stringify(keyObj));
  const cachePath = path.join(cacheDir, `${key}.json`);
  if (useCache && fs.existsSync(cachePath)) {
    const cached = readJSON(cachePath, null);
    if (cached) {
      console.log(`[Cache] ${item.name}: ${cached.pred?.length ?? 0} answer(s)`, (cached.pred || []).slice(0, 10));
      return { name: item.name, pred: cached.pred, elapsedMs: cached.elapsedMs, fromCache: true };
    }
  }

  const start = Date.now();
  let answers;
  if (dry) {
    ({ answers } = await baselineSearch({ content: item.content, query: item.query, k }));
  } else {
  const res = await searchWithGemini({ content: item.content, query: item.query, apiKey, model });
  answers = res.answers; const raw = res.raw;
    const count = answers?.length || 0;
    const preview = (answers || []).slice(0, k);
    console.log(`[Gemini] ${item.name}: ${count} answer(s)`, preview);
  const rawLen = typeof raw === 'string' ? raw.length : 0;
  const rawPreview = typeof raw === 'string' ? raw.slice(0, 300).replace(/\s+/g, ' ').trim() : '';
    console.log(`[Gemini] Raw preview (${rawLen} chars):`, rawPreview);
    if (!count) {
      console.error(`[Gemini] No results for "${item.name}". Likely an issue with API key/quota/model/prompt or upstream response.`);
    }
    if (saveRaw && useCache) {
      ensureDir(path.join(cacheDir, "raw"));
      fs.writeFileSync(path.join(cacheDir, "raw", `${key}.txt`), raw ?? "", "utf-8");
    }
  }
  const elapsedMs = Date.now() - start;
  const pred = (answers || []).slice(0, k);

  if (useCache) writeJSON(cachePath, { pred, elapsedMs });
  return { name: item.name, pred, elapsedMs, fromCache: false };
}

async function promisePool(items, limit, worker) {
  const results = new Array(items.length);
  let idx = 0; let active = 0; let resolveAll, rejectAll;
  const all = new Promise((res, rej) => { resolveAll = res; rejectAll = rej; });
  const next = () => {
    if (idx >= items.length && active === 0) return resolveAll(results);
    while (active < limit && idx < items.length) {
      const cur = idx++; active++;
      Promise.resolve(worker(items[cur], cur))
        .then((r) => { results[cur] = r; active--; next(); })
        .catch((e) => { results[cur] = { error: e.message }; active--; next(); });
    }
  };
  next();
  return all;
}

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!args.dry && !apiKey) {
    console.error("Usage: set GEMINI_API_KEY or run with --dry for baseline. Optional: --dataset <path> --k <n> --model <name> --concurrency <n> --nocache --saveRaw");
    process.exit(1);
  }

  const datasetPath = args.dataset;
  let dataset = readJSON(datasetPath, null);
  if (!dataset) {
    // Fallback inline dataset
    dataset = [
      {
        name: "Node & Gemini",
        content: [
          "Node.js docs: https://nodejs.org/en/",
          "Google AI Studio: https://aistudio.google.com/",
          "Generative AI JS: https://github.com/google-gemini/generative-ai-js"
        ],
        query: "哪里可以了解 @google/genai 和 Node.js?",
        truth: [
          "https://nodejs.org/en/",
          "https://aistudio.google.com/",
          "https://github.com/google-gemini/generative-ai-js"
        ]
      },
      {
        name: "Web Dev",
        content: [
          "MDN Web Docs: https://developer.mozilla.org/",
          "W3C: https://www.w3.org/"
        ],
        query: "Web 标准和文档去哪里看？",
        truth: [
          "https://developer.mozilla.org/",
          "https://www.w3.org/"
        ]
      }
    ];
  }

  // Normalize truths (do NOT dedupe; duplicates matter for text-occurrence tasks)
  dataset = dataset.map((d) => ({ ...d, truth: (d.truth || []).map(x => String(x)) }));

  const cacheDir = path.join(__dirname, ".cache");
  if (!args.nocache) ensureDir(cacheDir);

  console.log("Eval config:", { k: args.k, dataset: path.relative(process.cwd(), datasetPath), model: args.model || "default", concurrency: args.concurrency, cache: !args.nocache, dry: args.dry });

  const perItem = await promisePool(dataset, args.concurrency, (item) => runOne({ item, apiKey, model: args.model, k: args.k, cacheDir, useCache: !args.nocache, saveRaw: args.saveRaw, dry: args.dry }));

  const rows = [];
  let sumP = 0, sumR = 0, sumF1 = 0, sumAP = 0, sumRR = 0, sumnDCG = 0, sumTime = 0;
  let count = 0;
  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];
    const r = perItem[i];
    if (r?.error) { rows.push({ name: item.name, error: r.error }); continue; }
  const pred = (r.pred || []).map(x => String(x));
  const truth = item.truth;
  if (item.name === 'find Rs in StrawbeRry') {
    console.log(`[DEBUG] ${item.name}: pred=${JSON.stringify(pred)}, truth=${JSON.stringify(truth)}`);
  }
  const prf = prfForText(pred, truth);
  const ap = averagePrecisionMS(pred, truth);
  const rr = reciprocalRankMS(pred, truth);
  const ndcg = ndcgAtKMS(pred, truth, args.k);
    rows.push({ name: item.name, k: pred.length, precision: +prf.precision.toFixed(3), recall: +prf.recall.toFixed(3), f1: +prf.f1.toFixed(3), ap: +ap.toFixed(3), mrr: +rr.toFixed(3), ndcg: +ndcg.toFixed(3), ms: r.elapsedMs, cache: r.fromCache ? "Y" : "" });
    sumP += prf.precision; sumR += prf.recall; sumF1 += prf.f1; sumAP += ap; sumRR += rr; sumnDCG += ndcg; sumTime += r.elapsedMs; count++;
  }

  const summary = {
    count,
    precision: +(sumP / Math.max(1, count)).toFixed(4),
    recall: +(sumR / Math.max(1, count)).toFixed(4),
    f1: +(sumF1 / Math.max(1, count)).toFixed(4),
    map: +(sumAP / Math.max(1, count)).toFixed(4),
    mrr: +(sumRR / Math.max(1, count)).toFixed(4),
    ndcg: +(sumnDCG / Math.max(1, count)).toFixed(4),
    avg_ms: Math.round(sumTime / Math.max(1, count))
  };

  console.table(rows);
  console.log("Summary:", summary);

  // Save report
  const outPath = path.join(__dirname, "eval_results.json");
  writeJSON(outPath, { config: { k: args.k, model: args.model || "default", dataset: path.relative(process.cwd(), datasetPath), dry: args.dry }, rows, summary, ts: new Date().toISOString() });
  console.log("Saved:", path.relative(process.cwd(), outPath));
}

main().catch((e) => { console.error(e); process.exit(1); });
