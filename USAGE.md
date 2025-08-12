# vibe-search-gemini 使用指南

## 安装

### 方式一：直接从 GitHub 安装（推荐）

```bash
npm install git+https://github.com/gantrol/vibe-search-gemini.git
```

### 方式二：在 package.json 中添加依赖

```json
{
  "dependencies": {
    "vibe-search-gemini": "git+https://github.com/gantrol/vibe-search-gemini.git"
  }
}
```

然后运行：
```bash
npm install
```

## 基本使用

### 1. 导入库

```js
import { searchWithGemini } from "vibe-search-gemini";
```

### 2. 准备 API Key

获取 Gemini API Key：https://aistudio.google.com/apikey

```js
// 方式一：环境变量（推荐）
const apiKey = process.env.GEMINI_API_KEY;

// 方式二：直接传入（不推荐用于生产环境）
const apiKey = "your-api-key-here";
```

### 3. 调用搜索

```js
const result = await searchWithGemini({
  content: [
    "Node.js 官网：https://nodejs.org/",
    "Google AI Studio：https://aistudio.google.com/",
    "GitHub 仓库：https://github.com/google-gemini/generative-ai-js"
  ],
  query: "如何使用 Gemini API？",
  apiKey: apiKey
});

console.log("搜索结果：", result.answers);
console.log("原始响应：", result.raw);
```

## 高级用法

### 自定义模型

```js
const result = await searchWithGemini({
  content: "你的内容",
  query: "搜索查询",
  apiKey: apiKey,
  model: "gemini-2.5-flash",  // 默认模型
  maxTokens: 4096             // 最大输出 token 数
});
```

### 处理大量内容

```js
const largeContent = [
  "文档1的内容...",
  "文档2的内容...",
  "文档3的内容..."
];

const result = await searchWithGemini({
  content: largeContent,  // 会自动合并为单个字符串
  query: "查找特定信息",
  apiKey: apiKey
});
```

### 错误处理

```js
try {
  const result = await searchWithGemini({
    content: "内容",
    query: "查询",
    apiKey: apiKey
  });
  console.log(result.answers);
} catch (error) {
  if (error.message.includes("Missing")) {
    console.error("参数缺失：", error.message);
  } else if (error.message.includes("API")) {
    console.error("API 调用失败：", error.message);
  } else {
    console.error("未知错误：", error.message);
  }
}
```

## 完整示例

```js
import { searchWithGemini } from "vibe-search-gemini";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("请设置 GEMINI_API_KEY 环境变量");
    process.exit(1);
  }

  const content = [
    "技术文档：React 是一个用于构建用户界面的 JavaScript 库",
    "官方网站：https://reactjs.org/",
    "学习资源：https://react.dev/learn",
    "GitHub：https://github.com/facebook/react"
  ];

  try {
    const result = await searchWithGemini({
      content,
      query: "React 学习资源",
      apiKey,
      model: "gemini-2.5-flash"
    });

    console.log("找到的答案：");
    result.answers.forEach((answer, index) => {
      console.log(`${index + 1}. ${answer}`);
    });

  } catch (error) {
    console.error("搜索失败：", error.message);
  }
}

main();
```

## 环境变量设置

### Windows PowerShell
```powershell
$env:GEMINI_API_KEY = "your-api-key"
node your-script.js
```

### Windows CMD
```cmd
set GEMINI_API_KEY=your-api-key
node your-script.js
```

### Linux/macOS
```bash
export GEMINI_API_KEY=your-api-key
node your-script.js
```

### .env 文件

创建 `.env` 文件：
```
GEMINI_API_KEY=your-api-key
```

然后在代码中：
```js
import dotenv from "dotenv";
dotenv.config();
```

## 故障排除

### 常见错误

1. **"Missing apiKey"**
   - 确保已设置 API Key
   - 检查环境变量名称是否正确

2. **"Missing content"**
   - 确保传入了 content 参数
   - content 不能为空字符串或空数组

3. **"Missing query"**
   - 确保传入了 query 参数
   - query 不能为空字符串

4. **API 调用失败**
   - 检查网络连接
   - 验证 API Key 是否有效
   - 确认 API 配额是否充足

### 调试技巧

1. 启用详细日志：
```js
const result = await searchWithGemini({
  // ... 其他参数
});
console.log("原始响应：", result.raw);  // 查看模型的原始输出
```

2. 测试 API Key：
```js
// 简单测试
try {
  const result = await searchWithGemini({
    content: "test",
    query: "test",
    apiKey: "your-key"
  });
  console.log("API Key 有效");
} catch (error) {
  console.log("API Key 问题：", error.message);
}
```

## 更多示例

查看 `examples/` 目录中的更多示例：
- `examples/run.js` - 基本使用示例
- `examples/evaluate.js` - 评测脚本
- `examples/install-test.js` - 安装测试