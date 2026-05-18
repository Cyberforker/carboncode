export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id?: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolSpec[];
  thinking?: "enabled" | "disabled";
  reasoningEffort?: "high" | "max";
  temperature?: number;
  signal?: AbortSignal;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
}

export interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
  usage: ChatUsage;
  raw: unknown;
}

export interface ModelInfo {
  id: string;
  object: "model";
  owned_by: string;
}

export interface ModelList {
  object: "list";
  data: ModelInfo[];
}

export interface DeepSeekClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export class DeepSeekClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: DeepSeekClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY 未设置。请设置环境变量或运行 carboncode setup。");
    }
    this.apiKey = apiKey;
    let baseUrl = opts.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
    while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    this.baseUrl = baseUrl;
    this.timeoutMs = opts.timeoutMs ?? 660_000;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const signal = request.signal ?? controller.signal;
    try {
      const payload: Record<string, unknown> = {
        model: request.model,
        messages: request.messages,
        stream: false,
      };
      if (request.tools?.length) payload.tools = request.tools;
      if (request.temperature !== undefined) payload.temperature = request.temperature;
      if (request.thinking) payload.extra_body = { thinking: { type: request.thinking } };
      if (request.reasoningEffort) payload.reasoning_effort = request.reasoningEffort;

      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
      if (!response.ok) {
        throw new Error(`DeepSeek ${response.status}: ${await response.text()}`);
      }
      const raw = (await response.json()) as {
        choices?: Array<{ message?: { content?: string; tool_calls?: ToolCall[] } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          prompt_cache_hit_tokens?: number;
          prompt_cache_miss_tokens?: number;
        };
      };
      const message = raw.choices?.[0]?.message ?? {};
      return {
        content: message.content ?? "",
        toolCalls: message.tool_calls ?? [],
        usage: {
          promptTokens: raw.usage?.prompt_tokens ?? 0,
          completionTokens: raw.usage?.completion_tokens ?? 0,
          totalTokens: raw.usage?.total_tokens ?? 0,
          promptCacheHitTokens: raw.usage?.prompt_cache_hit_tokens ?? 0,
          promptCacheMissTokens:
            raw.usage?.prompt_cache_miss_tokens ??
            Math.max(0, (raw.usage?.prompt_tokens ?? 0) - (raw.usage?.prompt_cache_hit_tokens ?? 0)),
        },
        raw,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async listModels(opts: { signal?: AbortSignal } = {}): Promise<ModelList> {
    const response = await this.fetchImpl(`${this.baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: opts.signal,
    });
    if (!response.ok) {
      throw new Error(`DeepSeek ${response.status}: ${await response.text()}`);
    }
    const raw = (await response.json()) as ModelList;
    if (!raw || raw.object !== "list" || !Array.isArray(raw.data)) {
      throw new Error("DeepSeek models response 格式无效");
    }
    return raw;
  }
}
