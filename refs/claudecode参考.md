# Claude Code CLI 参考分析

参考代码：`refs/claude-cli-rs`

来源仓库：<https://github.com/Cyberforker/claude-cli-rs.git>

本地参考版本：`5739c1e`，分支 `master`

> 说明：该仓库不是 Carbon Code 的直接依赖，仅作为本地参考代码。`refs/` 已加入 `.gitignore`，避免把外部参考代码和分析草稿提交到主工程。

## 一、参考项目概览

`claude-cli-rs` 是一个 Rust workspace，目标是用 Rust 重新实现类似 Claude Code 的 CLI/TUI。它当前整体规模约 1.6 万行 Rust，模块划分清晰，单文件普遍较小：最大文件约 485 行。

### 技术栈

- Rust `edition = 2024`，`rust-version = 1.85`
- CLI：`clap`
- Async：`tokio`
- HTTP/SSE：`reqwest` + `futures-util`
- TUI：`ratatui` + `crossterm`
- 序列化：`serde` / `serde_json` / `serde_yaml`
- 错误处理：`anyhow` / `thiserror`
- 日志：`tracing`
- 文件/搜索：`ignore` / `globset` / shell fallback
- Diff：`similar`
- Auth：API Key、OAuth、Keychain、Bedrock、Vertex、Copilot proxy

### Workspace 结构

```text
crates/
├── cli/        # binary entry；参数、启动、print/interactive/self-test
├── core/       # Message、Tool trait、Permission、Config、State、Task
├── api/        # Anthropic API client、SSE parser、retry、error
├── query/      # QueryEngine、query loop、context compact、system prompt
├── tools/      # Bash/File/Grep/Glob/Web/Agent/Task/Skill 等工具
├── commands/   # slash command registry
├── mcp/        # MCP JSON-RPC/transport/types
├── tui/        # ratatui UI、输入框、message view、diff view、permission dialog
├── auth/       # provider resolution、OAuth、keychain、API key
├── services/   # session、analytics、cost、plugins、tips
├── bridge/     # websocket bridge / remote session
└── utils/      # shell、fs、diff、git、platform、markdown、tokens
```

## 二、与 Carbon Code 的核心差异

### Carbon Code 当前特点

Carbon Code 已经有较完整的 TypeScript/Node 产品形态：

- DeepSeek 原生、中文优先、prompt cache 成本优化
- Ink TUI、Dashboard、Desktop、MCP、ACP、QQ、semantic index
- 更成熟的审批、session、tool repair、budget、dashboard API
- 测试覆盖丰富，但大文件和多端维护压力较大

### claude-cli-rs 当前特点

`claude-cli-rs` 更像“结构清晰的 Rust 原型/参考实现”：

- workspace 分层非常清楚
- engine 与 TUI 通过事件 channel 解耦
- tool trait 简洁：`is_read_only`、`needs_permission`、`call`
- TUI 输入、diff、permission dialog 都被拆成小模块
- 自测和 integration 测试入口直接

但它目前也有明显早期痕迹：

- README 性能数据标注为 projected estimates，不是实测 benchmark
- 多处 `CROSS-DEP`、placeholder/future 注释
- `--resume` 参数存在，但主流程未看到完整 session resume 接入
- permission rule 结构有 `path_pattern` / `command_pattern`，但当前 `check_permission` 只按 tool name 判断
- query loop 比 Carbon Code 简单很多，没有 prompt-cache、tool-call repair、并行 tool dispatch、成本分层等机制

## 三、值得 Carbon Code 借鉴的点

### 1. “crate-like” 模块边界

`claude-cli-rs` 把 CLI、core、api、query、tools、tui、auth、services、utils 分成独立 crate。Carbon Code 不一定要改成 monorepo package，但可以借鉴这种边界来拆大文件。

建议优先拆分：

- `src/cli/ui/App.tsx`：按 state、event bridge、modal、dashboard wiring、render shell 拆分
- `src/config.ts`：按 config schema、load/save、presets、MCP config、semantic config、permissions 拆分
- `src/loop.ts`：保留主 orchestrator，把 streaming、tool dispatch、session heal、budget/escalation 分离成更稳定子模块
- `src/cli/commands/desktop.ts`：按 protocol、session/tab、tool bridge、UI event 分层

收益：降低冲突、提升测试定位、减少单点复杂度。

### 2. 统一的 AppServices / setup 构造器

参考代码中 `crates/cli/src/setup.rs` 集中完成：

1. 解析 cwd
2. 创建 config
3. 解析 auth provider
4. 创建 API client
5. 创建 tool set
6. 创建 command registry
7. 创建 QueryEngine

Carbon Code 当前 `chat`、`code`、`run`、`desktop`、`acp` 都各自拼装部分服务。可以抽一个 `createRuntimeServices()` 或 `buildAgentRuntime()`：

- 统一 DeepSeek client / baseUrl / apiKey 处理
- 统一 MCP runtime / tool registry 初始化
- 统一 session / transcript / usage wiring
- 统一 dashboard context wiring

收益：减少启动路径分叉，避免某个入口漏掉 env/config/dashboard/usage 逻辑。

### 3. 更显式的 tool 分层注册

`claude_tools` 把工具按优先级分组：

- P0：Bash、Grep
- P0b：FileRead、FileWrite、FileEdit、Glob
- P1：WebFetch、WebSearch、Agent
- P2：Todo、Config、Task、LSP、Notebook
- P3：Skill、Team、SendMessage

Carbon Code 已有大量工具，但目前“工具家族/风险等级/产品层级”的信息主要散落在注册逻辑和文档里。可以增加一个工具 manifest：

```ts
{
  name,
  category: "filesystem" | "shell" | "web" | "memory" | "agent" | ...,
  tier: "core" | "extension" | "experimental",
  readOnly,
  mutatesFilesystem,
  requiresApprovalByDefault,
  parallelSafe,
}
```

并为它加 invariant test：

- 每个 tool 有分类
- 每个 mutating tool 默认不可 parallelSafe
- plan mode 下 mutating tool 必须被拒绝
- dashboard 展示和 slash help 使用同一份 manifest

收益：更利于维护权限边界和 UI 展示。

### 4. Engine ↔ UI 的事件 channel 解耦

`claude-cli-rs` 的 `QueryEvent` 很简单：

- `StreamDelta`
- `ToolStart`
- `ToolEnd`
- `QueryComplete`
- `Error`

Carbon Code 已有更丰富的 `LoopEvent`，但 TUI、Dashboard、Desktop、ACP 都在消费事件。建议进一步明确：

- 核心事件：供 engine 产出，稳定且无 UI 依赖
- UI 投影事件：供 Ink/Dashboard/Desktop 使用，可包含展示元信息
- 审计事件：供 transcript/events/usage 使用，持久化稳定

收益：降低 Dashboard/Desktop 与 TUI 内部状态耦合。

### 5. `self-test` 风格的快速内部诊断

Carbon Code 已有 `doctor`，但可以借鉴 `self-test` 的简洁输出，补充更偏“开发者/维护者”的诊断：

- 当前模型、baseUrl、API key 是否可见但脱敏
- 注册工具数量和分类统计
- slash 命令数量
- MCP server 数量与 handshake 状态
- session 目录可写性
- dashboard token/host/port 配置合法性
- semantic index provider 配置状态

可以做成：

```bash
carboncode doctor --internal
# 或
carboncode self-test
```

收益：PR/bug report 时快速定位运行时装配问题。

### 6. FileRead 行号和范围读取体验

参考代码 `FileReadTool` 支持：

- `start_line`
- `end_line`
- 返回内容带行号前缀：`123 │ code`
- 二进制文件返回 `[Binary file, N bytes]`
- 默认最多返回 2000 行

Carbon Code 已有文件读取/搜索工具，但可检查是否在所有入口保持一致：

- read_file 返回可选行号
- 大文件默认范围化读取
- dashboard file-read 和 tool read_file 体验一致
- LLM 引用路径时能稳定定位行号

收益：更利于模型精确编辑和用户审阅。

### 7. Unicode 输入的微型单元测试

`PromptInput` 对字符索引和 byte offset 做了很聚焦的测试：

- 中文输入
- emoji 输入
- 光标移动
- backspace/delete 中文字符
- Shift+Enter 多行
- history cap

Carbon Code 的输入系统更复杂，尤其涉及 paste、tmux、mouse、vim keys。可以继续补这种“小而硬”的输入不变量测试，特别是：

- CJK + emoji + combining marks
- 多行编辑光标
- bracketed paste
- slash picker 与普通输入切换
- vim mode 下的字符边界

收益：防止终端输入体验回归。

### 8. Diff viewer 的模式抽象

参考代码有 `DiffMode::Unified | SideBySide`，并用 `unicode-width` 处理左右 pane 宽度。

Carbon Code 已有 diff/preview，但可以借鉴：

- diff viewer 内部显式维护 display mode
- 统一 diff 与 side-by-side 共享同一份 diff parser
- 对 CJK 宽度、窄终端、滚动位置加专门测试

收益：让 TUI 和 Dashboard 的 diff 展示逻辑更可验证。

### 9. Auth provider routing 抽象

参考代码把 provider 做成 enum：

- Anthropic API Key
- OAuth
- Bedrock
- Vertex
- Copilot proxy

Carbon Code 当前是 DeepSeek-first，但仍可借鉴 provider abstraction 的形式，用于：

- DeepSeek 官方 API
- OpenAI-compatible 代理
- 企业内网代理
- 区域化/镜像 base URL
- 将来可能的其它 DeepSeek-compatible provider

建议不是立即支持多模型厂商，而是把 DeepSeek client 的 “baseUrl/apiKey/model/pricing/rateLimit” 装配封装成 `ModelProvider` / `ProviderProfile`，让配置和测试更清楚。

### 10. WebFetch 的 SSRF 防护意识

参考代码在 `WebFetchTool` 中显式做了：

- 只允许 `http://` / `https://`
- block `localhost`、`.local`、`.internal`
- block 私有/loopback/link-local IP
- 限制 redirect 次数
- 限制响应大小

Carbon Code 的 web fetch/search 如果会访问任意 URL，应加强/确认类似防护：

- DNS 解析后的私网地址阻断
- redirect 后 URL 再校验
- IPv6 ULA/link-local 阻断
- 可配置 allowlist，用于用户明确允许访问内网文档时开启

注意：参考实现只检查 URL 字符串里的 host，未做 DNS 解析后的私网 IP 检查，不应原样照搬。

### 11. Shell 执行 timeout 与进程树清理

参考 `utils::shell` 有跨平台 shell 执行、timeout、timeout 后 kill process tree。

Carbon Code 已有更复杂的 shell/job 管理，可以对照确认：

- 超时后是否清理子进程树
- Windows `cmd.exe` / PowerShell 行为
- background jobs 退出时是否被 drain
- stderr/stdout 合并、截断和 exit code 展示是否一致

收益：减少长任务和 Ctrl+C 相关问题。

### 12. CI 脚本的阶段耗时摘要

参考 `scripts/ci.sh` 会逐步运行 check/clippy/test/build，并输出每阶段耗时和状态。

Carbon Code 可以给 `npm run verify` 加一个可选包装脚本：

```bash
npm run verify:timed
```

输出：

- build 耗时
- lint 耗时
- typecheck 耗时
- test 耗时
- 哪个阶段失败

收益：便于维护者定位 verify 慢点和 CI 失败点。

## 四、不建议直接借鉴或需要谨慎的点

### 1. Rust 重写不适合作为近期方向

Carbon Code 已经是成熟的 TS/Node + Ink/Dashboard/Desktop 体系。直接迁移 Rust 会带来：

- npm 包和插件生态断层
- Dashboard/Desktop/CLI event bridge 重写
- 现有测试迁移成本巨大
- DeepSeek prompt-cache/tool-repair/成本控制逻辑重写风险高

更现实的做法：借鉴模块边界、测试粒度和运行时抽象；不要重写语言栈。

### 2. 参考项目的性能数据不能作为事实依据

README 明确写的是 projected estimates，尚非 formal benchmarks。因此不应据此得出“Rust 一定快多少”的结论。

如 Carbon Code 要做性能优化，应基于自身：

- startup profile
- TUI render profile
- large repo file walk benchmark
- dashboard API latency
- tool dispatch latency

### 3. 权限逻辑比 Carbon Code 简化

参考项目的 permission rule 当前只按 tool name 匹配，没有真正使用 `path_pattern` / `command_pattern`。Bash read-only 检测也较粗：只做字符串包含和命令前缀判断。

Carbon Code 现有 shell allowlist、sensitive path、plan mode、approval gate 更成熟，不应降级。

### 4. Query loop 能力比 Carbon Code 少

参考项目 query loop 是：API stream → tool_use → serial execute tools → append results → next round。

缺少 Carbon Code 的关键优势：

- DeepSeek tool-call repair
- cache-first prefix
- context shrink/fold 策略
- parallel-safe dispatch
- cost/budget/preset escalation
- session heal
- dashboard/live modal integration

因此只能参考结构，不适合作为核心逻辑替换。

### 5. WebFetch 防护还不完整

虽然有 SSRF 意识，但它没有处理：

- 域名 DNS 解析到私网 IP
- redirect 后跳转到私网地址
- IPv6 ULA 等更完整范围

Carbon Code 若实现，应做得更完整。

## 五、建议落地优先级

### P0：低风险、马上有收益

1. 新增工具 manifest / 分类元数据，并加 invariant tests。
2. 为 CLI runtime 增加统一 builder，减少 `chat/code/run/desktop/acp` 重复装配。
3. 给 `doctor` 增加 `--internal` 或新增 `self-test`，输出 tool/slash/MCP/session/dashboard 诊断。
4. 给输入、diff、file read 行号等增加更聚焦的 Unicode/宽度/范围测试。

### P1：中等改动，改善维护性

1. 拆分 `src/cli/ui/App.tsx` 的状态、事件、modal、dashboard wiring。
2. 拆分 `src/config.ts` 中 schema、load/save、preset、MCP、semantic、permissions。
3. 把 `LoopEvent` 分成 core event、UI projection、audit/persisted event 三层类型。
4. 加强 `web_fetch` SSRF 防护和 redirect 后校验。

### P2：长期演进

1. 抽象 DeepSeek provider profile：官方 DeepSeek、自定义 DeepSeek-compatible、企业代理等。
2. 为 `npm run verify` 增加 timed wrapper，输出阶段耗时。
3. Dashboard 前端逐步从 JS/HTM 迁移到更强类型或至少启用关键模块 `checkJs`。

### P3：暂不建议

1. 不建议近期 Rust 重写主 CLI/TUI。
2. 不建议照搬参考项目的 permission/Bash read-only 判断。
3. 不建议基于其 projected benchmark 调整技术路线。

## 六、最适合 Carbon Code 的借鉴总结

最值得借鉴的不是 Rust 本身，而是这些工程组织方式：

- 清晰的模块边界
- 小文件、小单元测试
- runtime setup 集中化
- tool/command registry 元数据化
- engine 与 UI 用事件解耦
- 自测命令直接暴露关键运行时状态
- Unicode 输入和 diff 宽度这类终端细节用测试固定

这些改动能在不动 Carbon Code 核心技术栈的前提下，降低当前最大的维护风险：大文件、多入口装配、权限边界复杂、UI/服务端/桌面端事件耦合。
