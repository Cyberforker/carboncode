import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveDashboardHost,
  resolveDashboardHostEnv,
  resolveDashboardToken,
  resolveDashboardTokenEnv,
} from "../src/cli/dashboard-options.js";

describe("dashboard options", () => {
  const originalCarbonHost = process.env.CARBONCODE_DASHBOARD_HOST;
  const originalReasonixHost = process.env.REASONIX_DASHBOARD_HOST;
  const originalCarbonToken = process.env.CARBONCODE_DASHBOARD_TOKEN;
  const originalReasonixToken = process.env.REASONIX_DASHBOARD_TOKEN;

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalCarbonHost === undefined)
      Reflect.deleteProperty(process.env, "CARBONCODE_DASHBOARD_HOST");
    else process.env.CARBONCODE_DASHBOARD_HOST = originalCarbonHost;

    if (originalReasonixHost === undefined)
      Reflect.deleteProperty(process.env, "REASONIX_DASHBOARD_HOST");
    else process.env.REASONIX_DASHBOARD_HOST = originalReasonixHost;

    if (originalCarbonToken === undefined)
      Reflect.deleteProperty(process.env, "CARBONCODE_DASHBOARD_TOKEN");
    else process.env.CARBONCODE_DASHBOARD_TOKEN = originalCarbonToken;

    if (originalReasonixToken === undefined)
      Reflect.deleteProperty(process.env, "REASONIX_DASHBOARD_TOKEN");
    else process.env.REASONIX_DASHBOARD_TOKEN = originalReasonixToken;
  });

  it("prefers the dashboard host flag over env", () => {
    process.env.CARBONCODE_DASHBOARD_HOST = "0.0.0.0";

    expect(resolveDashboardHost(" 127.0.0.1 ", true)).toBe("127.0.0.1");
  });

  it("prefers CARBONCODE_DASHBOARD_HOST over the legacy REASONIX_DASHBOARD_HOST", () => {
    process.env.CARBONCODE_DASHBOARD_HOST = "0.0.0.0";
    process.env.REASONIX_DASHBOARD_HOST = "127.0.0.1";

    expect(resolveDashboardHostEnv()).toBe("0.0.0.0");
    expect(resolveDashboardHost(undefined, true)).toBe("0.0.0.0");
  });

  it("keeps REASONIX_DASHBOARD_HOST as a legacy fallback", () => {
    Reflect.deleteProperty(process.env, "CARBONCODE_DASHBOARD_HOST");
    process.env.REASONIX_DASHBOARD_HOST = "127.0.0.1";

    expect(resolveDashboardHostEnv()).toBe("127.0.0.1");
    expect(resolveDashboardHost(undefined, true)).toBe("127.0.0.1");
  });

  it("prefers CARBONCODE_DASHBOARD_TOKEN over the legacy REASONIX_DASHBOARD_TOKEN", () => {
    process.env.CARBONCODE_DASHBOARD_TOKEN = "carbon-token-1234";
    process.env.REASONIX_DASHBOARD_TOKEN = "reasonix-token-123";

    expect(resolveDashboardTokenEnv()).toBe("carbon-token-1234");
    expect(resolveDashboardToken(true)).toBe("carbon-token-1234");
  });

  it("keeps REASONIX_DASHBOARD_TOKEN as a legacy fallback", () => {
    Reflect.deleteProperty(process.env, "CARBONCODE_DASHBOARD_TOKEN");
    process.env.REASONIX_DASHBOARD_TOKEN = "reasonix-token-123";

    expect(resolveDashboardTokenEnv()).toBe("reasonix-token-123");
    expect(resolveDashboardToken(true)).toBe("reasonix-token-123");
  });

  it("drops short dashboard tokens before use", () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.env.CARBONCODE_DASHBOARD_TOKEN = "short";

    expect(resolveDashboardToken(true)).toBeUndefined();
    expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining("min 16"));
  });
});
