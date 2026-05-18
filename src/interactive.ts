import type { AgentRunResult, AgentRunner } from "./agent.js";
import type { ChatMessage } from "./client.js";

export interface InteractiveIO {
  write(line: string): void;
  question(prompt: string): Promise<string>;
}

export interface InteractiveOptions {
  sessionName: string;
  io: InteractiveIO;
  loadMessages: (name: string) => ChatMessage[];
  saveMessages: (name: string, messages: readonly ChatMessage[]) => void;
  createRunner: (initialMessages: ChatMessage[]) => Pick<AgentRunner, "run">;
}

export async function runInteractiveSession(opts: InteractiveOptions): Promise<void> {
  let history = opts.loadMessages(opts.sessionName);
  opts.io.write("Carbon Code 已启动。输入任务开始，输入 /exit 退出。");

  while (true) {
    const input = (await opts.io.question("carboncode> ")).trim();
    if (!input) continue;
    if (input === "/exit" || input === "/quit") {
      opts.io.write("已退出。");
      return;
    }

    opts.io.write("思考中...");
    const result: AgentRunResult = await opts.createRunner(history).run(input);
    history = result.messages;
    opts.saveMessages(opts.sessionName, history);
    if (result.changedFiles.length > 0) {
      opts.io.write(`变更文件: ${result.changedFiles.join(", ")}`);
    }
    if (result.summary.trim()) opts.io.write(result.summary.trim());
    opts.io.write(`Tokens: ${result.totalTokens}`);
    if (result.costUsd !== undefined) opts.io.write(`费用估算: $${result.costUsd.toFixed(6)}`);
  }
}
