import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { AgentRunner } from "../src/agent.js";
import type { ChatRequest } from "../src/client.js";

const roots: string[] = [];

function makeRoot(): string {
  const root = join(tmpdir(), `carbon-agent-${Date.now()}-${Math.random()}`);
  mkdirSync(root, { recursive: true });
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("agent runner", () => {
  test("executes approved file edit tool calls and summarizes final output", async () => {
    const root = makeRoot();
    writeFileSync(join(root, "README.md"), "hello Reasonix\n", "utf8");
    const calls: unknown[] = [];
    const client = {
      async chat(request: unknown) {
        calls.push(request);
        if (calls.length === 1) {
          return {
            content: "",
            toolCalls: [
              {
                id: "call-1",
                function: {
                  name: "edit_file",
                  arguments: JSON.stringify({
                    path: "README.md",
                    search: "Reasonix",
                    replace: "Carbon Code",
                  }),
                },
              },
            ],
            usage: { totalTokens: 11 },
          };
        }
        return { content: "已完成。", toolCalls: [], usage: { totalTokens: 5 } };
      },
    };
    const runner = new AgentRunner({
      rootDir: root,
      client,
      approve: async () => true,
    });

    const result = await runner.run("改名");

    expect(readFileSync(join(root, "README.md"), "utf8")).toBe("hello Carbon Code\n");
    expect(result.summary).toContain("已完成");
    expect(result.changedFiles).toEqual(["README.md"]);
    expect(result.totalTokens).toBe(16);
  });

  test("sends assistant tool_calls before tool results on the next model turn", async () => {
    const root = makeRoot();
    writeFileSync(join(root, "README.md"), "hello Reasonix\n", "utf8");
    const calls: ChatRequest[] = [];
    const client = {
      async chat(request: ChatRequest) {
        calls.push(request);
        if (calls.length === 1) {
          return {
            content: "",
            toolCalls: [
              {
                id: "call-1",
                function: {
                  name: "read_file",
                  arguments: JSON.stringify({ path: "README.md" }),
                },
              },
            ],
            usage: { totalTokens: 3 },
          };
        }
        return { content: "读完了。", toolCalls: [], usage: { totalTokens: 4 } };
      },
    };
    const runner = new AgentRunner({ rootDir: root, client, approve: async () => true });

    await runner.run("读 README");

    expect(calls).toHaveLength(2);
    expect(calls[1]!.messages).toContainEqual(
      expect.objectContaining({
        role: "assistant",
        content: "",
        tool_calls: [
          expect.objectContaining({
            id: "call-1",
            function: expect.objectContaining({ name: "read_file" }),
          }),
        ],
      }),
    );
    expect(calls[1]!.messages).toContainEqual(
      expect.objectContaining({
        role: "tool",
        tool_call_id: "call-1",
        content: "hello Reasonix\n",
      }),
    );
  });
});
