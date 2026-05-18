import { describe, expect, test } from "vitest";
import { MODEL_PROFILES, resolveModelProfile } from "../src/models.js";

describe("DeepSeek model profiles", () => {
  test("defaults to official V4 Flash and exposes V4 Pro", () => {
    expect(MODEL_PROFILES.flash.model).toBe("deepseek-v4-flash");
    expect(MODEL_PROFILES.pro.model).toBe("deepseek-v4-pro");
    expect(resolveModelProfile("auto")).toEqual(MODEL_PROFILES.flash);
  });

  test("maps legacy Reasonix-style profile names to Carbon profiles", () => {
    expect(resolveModelProfile("fast")).toEqual(MODEL_PROFILES.flash);
    expect(resolveModelProfile("smart")).toEqual(MODEL_PROFILES.pro);
    expect(resolveModelProfile("max")).toEqual(MODEL_PROFILES.pro);
  });
});
