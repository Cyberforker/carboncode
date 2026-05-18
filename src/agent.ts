import type { ChatMessage, ChatRequest, ChatResponse, ToolCall, ToolSpec } from "./client.js";
import { MODEL_PROFILES, type ModelProfile, resolveModelProfile } from "./models.js";
import { loadProjectRules, renderRulesForPrompt } from "./rules.js";
import { createWorkspaceTools, type Approve } from "./tools/filesystem.js";
import { runApprovedShellCommand } from "./tools/shell.js";

export interface AgentClient {
  chat(request: ChatRequest): Promise<
    | ChatResponse
    | {
        content: string;
        toolCalls?: ToolCall[];
        usage?: { totalTokens?: number; total_tokens?: number };
      }
  >;
}

export interface AgentRunnerOptions {
  rootDir: string;
  client: AgentClient;
  approve: Approve;
  profile?: string;
  initialMessages?: ChatMessage[];
  maxTurns?: number;
}

export interface AgentRunResult {
  summary: string;
  changedFiles: string[];
  totalTokens: number;
  messages: ChatMessage[];
}

const TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "读取项目内 UTF-8 文件。",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description: "按文件名搜索项目文件。",
      parameters: {
        type: "object",
        properties: { pattern: { type: "string" } },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_content",
      description: "在项目文件内容中搜索文本或正则。",
      parameters: {
        type: "object",
        properties: { pattern: { type: "string" } },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "用唯一 search/replace 安全编辑文件，执行前必须得到用户批准。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          search: { type: "string" },
          replace: { type: "string" },
        },
        required: ["path", "search", "replace"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_shell",
      description: "执行 shell 命令，执行前必须得到用户批准。",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
];

export class AgentRunner {
  private readonly profile: ModelProfile;

  constructor(private readonly opts: AgentRunnerOptions) {
    this.profile = resolveModelProfile(opts.profile) ?? MODEL_PROFILES.flash;
  }

  async run(task: string): Promise<AgentRunResult> {
    const rules = await loadProjectRules(this.opts.rootDir);
    const system = buildSystemPrompt(renderRulesForPrompt(rules));
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...(this.opts.initialMessages ?? []),
      { role: "user", content: task },
    ];
    const tools = createWorkspaceTools(this.opts.rootDir, { approve: this.opts.approve });
    const changed = new Set<string>();
    let totalTokens = 0;
    let summary = "";

    for (let turn = 0; turn < (this.opts.maxTurns ?? 8); turn++) {
      const response = await this.opts.client.chat({
        model: this.profile.model,
        messages,
        tools: TOOL_SPECS,
        thinking: this.profile.thinking,
        reasoningEffort: this.profile.reasoningEffort,
      });
      totalTokens += usageTokens(response.usage);
      const toolCalls = response.toolCalls ?? [];
      messages.push({ role: "assistant", content: response.content ?? "" });

      if (toolCalls.length === 0) {
        summary = response.content ?? "";
        break;
      }

      for (const call of toolCalls) {
        const output = await this.executeTool(call, tools, changed);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: output,
        });
      }
    }

    return {
      summary,
      changedFiles: [...changed].sort(),
      totalTokens,
      messages,
    };
  }

  private async executeTool(
    call: ToolCall,
    tools: ReturnType<typeof createWorkspaceTools>,
    changed: Set<string>,
  ): Promise<string> {
    const args = parseToolArgs(call.function.arguments);
    switch (call.function.name) {
      case "read_file":
        return tools.readFile({ path: requireString(args.path, "path") });
      case "search_files":
        return tools.searchFiles({ pattern: requireString(args.pattern, "pattern") });
      case "search_content":
        return tools.searchContent({ pattern: requireString(args.pattern, "pattern") });
      case "edit_file": {
        const path = requireString(args.path, "path");
        const output = await tools.editFile({
          path,
          search: requireString(args.search, "search"),
          replace: requireString(args.replace, "replace"),
        });
        if (output.startsWith("edited ")) changed.add(path);
        return output;
      }
      case "run_shell": {
        const command = requireString(args.command, "command");
        const result = await runApprovedShellCommand(command, {
          cwd: this.opts.rootDir,
          approve: async (request) => this.opts.approve(request),
        });
        return [
          `approved=${result.approved}`,
          `exitCode=${result.exitCode ?? ""}`,
          result.stdout ? `stdout:\n${result.stdout}` : "",
          result.stderr ? `stderr:\n${result.stderr}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }
      default:
        return `未知工具: ${call.function.name}`;
    }
  }
}

function buildSystemPrompt(rules: string): string {
  const base =
    "你是 Carbon Code，一个中文优先、DeepSeek 驱动的个人终端代码智能体。先阅读项目，再做小步修改；写文件和执行命令前必须请求批准；结尾用简洁中文总结变更、验证结果和剩余风险。";
  return rules ? `${base}\n\n项目规则:\n${rules}` : base;
}

function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`工具参数 ${name} 必须是非空字符串`);
  }
  return value;
}

function usageTokens(usage: unknown): number {
  if (!usage || typeof usage !== "object") return 0;
  const record = usage as Record<string, unknown>;
  const camel = record.totalTokens;
  const snake = record.total_tokens;
  if (typeof camel === "number") return camel;
  if (typeof snake === "number") return snake;
  return 0;
}
