import type { ChatUsage } from "./client.js";

export interface ModelPricing {
  inputCacheHitUsdPerMillion: number;
  inputCacheMissUsdPerMillion: number;
  outputUsdPerMillion: number;
}

export interface CostEstimate {
  usd: number;
  note: string;
}

export const DEEPSEEK_V4_PRICING: Record<string, ModelPricing> = {
  "deepseek-v4-flash": {
    inputCacheHitUsdPerMillion: 0.0028,
    inputCacheMissUsdPerMillion: 0.14,
    outputUsdPerMillion: 0.28,
  },
  "deepseek-v4-pro": {
    inputCacheHitUsdPerMillion: 0.003625,
    inputCacheMissUsdPerMillion: 0.435,
    outputUsdPerMillion: 0.87,
  },
};

export function estimateUsageCost(model: string, usage: ChatUsage): CostEstimate {
  const pricing = DEEPSEEK_V4_PRICING[model];
  if (!pricing) return { usd: 0, note: `未知模型 ${model}，无法估算费用。` };

  const hit = usage.promptCacheHitTokens ?? 0;
  const miss = usage.promptCacheMissTokens ?? Math.max(0, usage.promptTokens - hit);
  const output = usage.completionTokens;
  const usd =
    (hit / 1_000_000) * pricing.inputCacheHitUsdPerMillion +
    (miss / 1_000_000) * pricing.inputCacheMissUsdPerMillion +
    (output / 1_000_000) * pricing.outputUsdPerMillion;
  return {
    usd,
    note: "费用为基于 DeepSeek 官方 V4 pricing 的估算，实际账单以 DeepSeek 后台为准。",
  };
}

export function formatCostSummary(model: string, usage: ChatUsage): string {
  const estimate = estimateUsageCost(model, usage);
  return `Tokens: ${usage.totalTokens} · 费用估算: $${estimate.usd.toFixed(6)}`;
}
