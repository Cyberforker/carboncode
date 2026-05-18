import { describe, expect, test } from "vitest";
import { runInteractiveSession } from "../src/interactive.js";
import type { AgentRunResult } from "../src/agent.js";

describe("interactive session", () => {
  test("runs tasks until exit and persists latest messages", async () => {
    const output: string[] = [];
    const saved: unknown[] = [];
    const inputs = ["改 README", "/exit"];
    const result: AgentRunResult = {
      summary: "已完成。",
      changedFiles: ["README.md"],
      totalTokens: 12,
      messages: [{ role: "user", content: "改 README" }],
    };

    await runInteractiveSession({
      sessionName: "default",
      io: {
        write: (line) => output.push(line),
        question: async () => inputs.shift() ?? "/exit",
      },
      loadMessages: () => [],
      saveMessages: (_name, messages) => saved.push(messages),
      createRunner: () => ({
        run: async () => result,
      }),
    });

    expect(output.join("\n")).toContain("Carbon Code 已启动");
    expect(output.join("\n")).toContain("变更文件: README.md");
    expect(output.join("\n")).toContain("Tokens: 12");
    expect(output.join("\n")).toContain("已退出");
    expect(saved).toEqual([[{ role: "user", content: "改 README" }]]);
  });
});
