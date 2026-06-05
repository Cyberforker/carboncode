# Carbon Code 开发调试运行说明

Carbon Code 不需要先 `npm install -g @carboncode/cli` 才能开发调试。全局安装是给最终用户使用的；本地开发可以直接在仓库中运行 TypeScript 源码入口。

## 1. 安装依赖

在项目根目录执行：

```bash
cd /Volumes/CopilotDisk/Codes/CarbonCode/carboncode
npm install
```

## 2. 本地源码启动

最常用方式：

```bash
npm run dev
```

它等价于：

```bash
tsx src/cli/index.ts
```

即直接运行 CLI TypeScript 源码入口。

## 3. 常用调试命令

```bash
npm run dev
```

默认无子命令：首次运行进入 setup；已有配置后通常进入 code 模式。

```bash
npm run chat
```

纯聊天模式，等价于：

```bash
tsx src/cli/index.ts chat
```

以当前目录进入 code 模式：

```bash
npx tsx src/cli/index.ts code .
```

非交互一次性任务：

```bash
npx tsx src/cli/index.ts run "帮我总结这个项目"
```

环境诊断：

```bash
npx tsx src/cli/index.ts doctor
```

## 4. DeepSeek API Key 配置

开发调试也需要 DeepSeek Key。

临时环境变量方式：

```bash
export DEEPSEEK_API_KEY=sk-...
```

或创建本地 `.env`：

```bash
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY
```

也可以首次运行 `npm run dev`，通过 setup wizard 配置。配置会写入：

```text
~/.carboncode/config.json
```

注意：不要提交 `.env`、API key、`~/.carboncode/` 下的本地用户配置或密钥。

## 5. 调试构建后 CLI

```bash
npm run build
node dist/cli/index.js
node dist/cli/index.js chat
node dist/cli/index.js doctor
```

## 6. 模拟全局安装命令

如果希望在本机直接使用 `carboncode` / `ccode` 命令测试，可以使用 npm link：

```bash
npm link
carboncode
ccode
```

取消链接：

```bash
npm unlink -g @carboncode/cli
```

日常开发推荐优先使用：

```bash
npm run dev
```

或：

```bash
npx tsx src/cli/index.ts ...
```
