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
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dataset" && argv[i + 1]) { args.dataset = path.resolve(argv[++i]); continue; }
    if (a === "--k" && argv[i + 1]) { args.k = Math.max(1, parseInt(argv[++i], 10) || 10); continue; }
    if (a === "--concurrency" && argv[i + 1]) { args.concurrency = Math.max(1, parseInt(argv[++i], 10) || 2); continue; }
    if (a === "--model" && argv[i + 1]) { args.model = argv[++i]; continue; }
    if (a === "--nocache") { args.nocache = true; continue; }
    if (a === "--saveRaw") { args.saveRaw = true; continue; }
    if (a === "--dry") { args.dry = true; continue; }
  }
  return args;
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function readJSON(p, fallback) { try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return fallback; } }
function writeJSON(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8"); }

function normalizeUrl(u) {
  if (!u) return "";
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    const proto = url.protocol.toLowerCase();
    let pathname = url.pathname || "/";
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    const qs = url.search ?? "";
    return `${proto}//${host}${pathname}${qs}`;
  } catch {
    // Fallback: lowercase and trim trailing slash
    return String(u).trim().toLowerCase().replace(/\/$/, "");
  }
}

function uniqueOrder(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    if (!seen.has(x)) { seen.add(x); out.push(x); }
  }
  return out;
}

// Metrics
function precisionRecallF1(pred, truth) {
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

function averagePrecision(pred, truth) {
  const setTruth = new Set(truth);
  let hit = 0; let sumPrec = 0;
  pred.forEach((p, idx) => {
    if (setTruth.has(p)) { hit++; sumPrec += hit / (idx + 1); }
  });
  return setTruth.size ? (sumPrec / setTruth.size) : 0;
}

function reciprocalRank(pred, truth) {
  const setTruth = new Set(truth);
  for (let i = 0; i < pred.length; i++) {
    if (setTruth.has(pred[i])) return 1 / (i + 1);
  }
  return 0;
}

function ndcgAtK(pred, truth, k = pred.length) {
  const setTruth = new Set(truth);
  const gains = pred.slice(0, k).map((p) => setTruth.has(p) ? 1 : 0);
  const dcg = gains.reduce((acc, g, i) => acc + (g / Math.log2(i + 2)), 0);
  const ideal = Array(Math.min(k, truth.length)).fill(1).reduce((acc, g, i) => acc + (g / Math.log2(i + 2)), 0);
  return ideal > 0 ? dcg / ideal : 0;
}

// Simple hashing for cache keys (djb2)
function djb2(str) {
  let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

async function baselineSearch({ content, query, k }) {
  // Heuristic: return URLs present in content, ranked by simple keyword overlap with query.
  const text = Array.isArray(content) ? content.join("\n") : String(content || "");
  const urls = Array.from(new Set(text.match(/https?:\/\/[\w\-\.\/%#?=&]+/gi) || []));
  const tokens = new Set(String(query || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  const scored = urls.map((u) => {
    const uLow = u.toLowerCase();
    let score = 0; tokens.forEach((t) => { if (uLow.includes(t)) score++; });
    return { url: u, score };
  }).sort((a, b) => b.score - a.score);
  return { sites: scored.slice(0, k).map(s => ({ url: s.url, score: s.score })) };
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
  const keyObj = { c: item.content, q: item.query, m: model, k };
  const key = djb2(JSON.stringify(keyObj));
  const cachePath = path.join(cacheDir, `${key}.json`);
  if (useCache && fs.existsSync(cachePath)) {
    const cached = readJSON(cachePath, null);
    if (cached) {
      console.log(`[Cache] ${item.name}: ${cached.pred?.length ?? 0} site(s)`, (cached.pred || []).slice(0, 10));
      return { name: item.name, pred: cached.pred, elapsedMs: cached.elapsedMs, fromCache: true };
    }
  }

  const start = Date.now();
  let sites; let answers;
  if (dry) {
    if ((item.type || 'url') === 'url') {
      ({ sites } = await baselineSearch({ content: item.content, query: item.query, k }));
    } else {
      // simple baseline: find exact characters listed in query, in order of appearance
      const text = Array.isArray(item.content) ? item.content.join("\n") : String(item.content || "");
      const tokens = String(item.query || "").split(/[;,\s]+/).filter(Boolean);
      const found = [];
      for (const t of tokens) {
        const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g');
        let m; while ((m = re.exec(text)) && found.length < k) { found.push(m[0]); }
      }
      answers = found;
    }
  } else {
    const mode = (item.type || 'url') === 'text' ? 'text' : 'url';
    const res = await searchWithGemini({ content: item.content, query: item.query, apiKey, model, mode });
    sites = res.sites; answers = res.answers;
    const count = mode === 'text' ? (answers?.length || 0) : (Array.isArray(sites) ? sites.length : 0);
    const preview = mode === 'text' ? (answers || []).slice(0, k) : (sites || []).map(x => x?.url).filter(Boolean).slice(0, k);
    console.log(`[Gemini] ${item.name}: ${count} ${mode === 'text' ? 'answer(s)' : 'site(s)'} `, preview);
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
  const mode = (item.type || 'url');
  const pred = mode === 'text'
    ? uniqueOrder(answers || []).slice(0, k)
    : uniqueOrder((sites || []).map((x) => normalizeUrl(x.url))).slice(0, k);

  if (useCache) writeJSON(cachePath, { pred, elapsedMs });
  return { name: item.name, pred, elapsedMs, fromCache: false, mode };
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

  // Normalize truths
  dataset = dataset.map((d) => {
    const mode = (d.type || 'url');
    if (mode === 'text') return { ...d, truth: uniqueOrder((d.truth || []).map(x => String(x))) };
    return { ...d, truth: uniqueOrder((d.truth || []).map(normalizeUrl)) };
  });

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
  const mode = (item.type || 'url');
  const pred = (r.pred || []).map(x => mode === 'text' ? String(x) : normalizeUrl(x));
  const truth = item.truth;
  const prf = mode === 'text' ? prfForText(pred, truth) : precisionRecallF1(pred, truth);
  const ap = averagePrecision(pred, truth);
  const rr = reciprocalRank(pred, truth);
  const ndcg = ndcgAtK(pred, truth, args.k);
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
