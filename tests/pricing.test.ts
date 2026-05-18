import { describe, expect, test } from "vitest";
import { estimateUsageCost, formatCostSummary } from "../src/pricing.js";

describe("pricing", () => {
  test("estimates DeepSeek V4 Flash cost with cache hit and miss tokens", () => {
    const cost = estimateUsageCost("deepseek-v4-flash", {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      promptCacheHitTokens: 200,
      promptCacheMissTokens: 800,
    });

    expect(cost.usd).toBeCloseTo(0.00025256, 10);
    expect(cost.note).toContain("估算");
  });

  test("formats Chinese token and cost summary", () => {
    expect(
      formatCostSummary("deepseek-v4-pro", {
        promptTokens: 1000,
        completionTokens: 1000,
        totalTokens: 2000,
        promptCacheHitTokens: 0,
        promptCacheMissTokens: 1000,
      }),
    ).toContain("费用估算");
  });
});
