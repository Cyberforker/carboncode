import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { checkAuth } from "../src/server/index.js";

const TOKEN = "stable-dashboard-token-123456";

function req(url: string, headers: Record<string, string> = {}): IncomingMessage {
  return { url, headers } as IncomingMessage;
}

describe("dashboard auth token headers", () => {
  it("accepts X-Carboncode-Token for mutations", () => {
    expect(
      checkAuth(req("/api/settings", { "x-carboncode-token": TOKEN }), TOKEN, true),
    ).toBeNull();
  });

  it("keeps X-Reasonix-Token as a legacy mutation fallback", () => {
    expect(checkAuth(req("/api/settings", { "x-reasonix-token": TOKEN }), TOKEN, true)).toBeNull();
  });

  it("rejects mutation requests that only pass the query token", () => {
    const result = checkAuth(req(`/api/settings?token=${TOKEN}`), TOKEN, true);

    expect(result?.status).toBe(403);
    expect(result?.body).toContain("X-Carboncode-Token");
  });

  it("accepts query tokens for reads", () => {
    expect(checkAuth(req(`/api/settings?token=${TOKEN}`), TOKEN, false)).toBeNull();
  });

  it("prefers the Carbon header when both header names are present", () => {
    expect(
      checkAuth(
        req("/api/settings", {
          "x-carboncode-token": TOKEN,
          "x-reasonix-token": "wrong-token",
        }),
        TOKEN,
        true,
      ),
    ).toBeNull();
  });
});
