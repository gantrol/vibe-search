# vibe-search-gemini

LLM 抽卡搜索：使用 Google Gemini 在给定语料中直接检索相关网站的 Node.js 库。

## 安装

```powershell
npm i
```

## 快速开始

库暴露 `searchWithGemini({ content, query, apiKey, model? })`。

- 输入
  - content: string | string[] — 被搜索内容（语料）
  - query: string — 搜索词
  - apiKey: string — Gemini API Key（建议放在环境变量）
  - model?: string — 模型名，默认为 `gemini-2.5-flash`
- 输出
  - `{ sites: Array<{ url, title?, score, evidence? }>, raw }`

示例：

```js
import { searchWithGemini } from "./src/index.js";

const { sites, raw } = await searchWithGemini({
  content: [
    "Node.js: https://nodejs.org/en/",
    "Google AI Studio: https://aistudio.google.com/",
  ],
  query: "哪里可以学习 Node.js 与 Gemini?",
  apiKey: process.env.GEMINI_API_KEY,
});
console.log(sites);
```

运行示例脚本：

```powershell
$env:GEMINI_API_KEY = "<your-key>"; node examples/run.js
```

## 评测

提供评测脚本，支持：
- 指标：Precision/Recall/F1、MAP、MRR、nDCG@k
- 干跑模式（--dry，无需 API）
- JSON 数据集、缓存、并发

```powershell
# 干跑（快速）
node examples/evaluate.js --dry --dataset examples/dataset.sample.json --k 5 --concurrency 2

# 真实模型
$env:GEMINI_API_KEY = "<your-key>"; node examples/evaluate.js --dataset examples/dataset.sample.json --k 5 --concurrency 2 --model gemini-2.5-flash
```

数据集：
- `examples/dataset.sample.json` — 小型中英双语示例
- `examples/dataset.complex.json` — 更复杂、覆盖边界场景

命令行：
- `--dataset <path>` 指定数据集（JSON 数组）
- `--k <n>` 指标计算的截断深度
- `--model <name>` Gemini 模型名
- `--concurrency <n>` 并发数
- `--dry` 使用启发式基线（不调用 API）
- `--nocache` 禁用缓存；`--saveRaw` 保存原始 LLM 输出

## API

方法：`searchWithGemini(options)`
- 参数
  - `content: string | string[]`
  - `query: string`
  - `apiKey: string`
  - `model?: string`（默认 `gemini-2.5-flash`）
  - `maxTokens?: number`（默认 2048）
- 返回
  - `{ sites: { url: string, title?: string, score: number, evidence?: string }[], raw: string }`

说明：
- 优先返回语料中出现的 URL；若没有，会给出可能的链接（分数较低）。
- 若模型未返回 JSON，本库会尝试解析并回退到正则提取 URL。

## 要求

- 推荐 Node.js 18+
- 有效的 Gemini API Key，[AIStuido](https://aistudio.google.com/apikey)
- 依赖：`@google/genai`

## English

英文文档见 `README.md`。
