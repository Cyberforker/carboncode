import { describe, expect, test } from "vitest";
import { DeepSeekClient } from "../src/client.js";
import { runDoctor } from "../src/doctor.js";

describe("doctor", () => {
  test("checks DeepSeek connectivity without exposing the api key", async () => {
    const client = new DeepSeekClient({
      apiKey: "sk-secret",
      fetch: async () =>
        new Response(
          JSON.stringify({
            object: "list",
            data: [{ id: "deepseek-v4-flash", object: "model", owned_by: "deepseek" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });

    const result = await runDoctor({ client });

    expect(result.ok).toBe(true);
    expect(result.lines.join("\n")).toContain("DeepSeek API 连接正常");
    expect(result.lines.join("\n")).toContain("deepseek-v4-flash");
    expect(result.lines.join("\n")).not.toContain("sk-secret");
  });
});
