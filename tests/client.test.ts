import { describe, expect, test } from "vitest";
import { DeepSeekClient } from "../src/client.js";

describe("DeepSeek client", () => {
  test("sends V4 thinking toggle through extra_body", async () => {
    const requests: unknown[] = [];
    const client = new DeepSeekClient({
      apiKey: "key",
      fetch: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "ok" } }],
            usage: { total_tokens: 3 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    await client.chat({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "hi" }],
      thinking: "enabled",
    });

    expect(requests[0]).toMatchObject({
      model: "deepseek-v4-pro",
      extra_body: { thinking: { type: "enabled" } },
    });
  });
});
