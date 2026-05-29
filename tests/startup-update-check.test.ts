import { afterEach, describe, expect, it } from "vitest";
import { getStartupUpdateHint, shouldRunStartupUpdateCheck } from "../src/cli/startup-update.js";
import { setLanguageRuntime } from "../src/i18n/index.js";

describe("startup update check", () => {
  afterEach(() => {
    setLanguageRuntime("EN");
  });

  it("runs only for interactive package-manager installs", () => {
    expect(
      shouldRunStartupUpdateCheck({
        config: {},
        env: {},
        installSource: "npm",
        stdoutIsTTY: true,
      }),
    ).toBe(true);

    expect(
      shouldRunStartupUpdateCheck({
        config: {},
        env: {},
        installSource: "unknown",
        stdoutIsTTY: true,
      }),
    ).toBe(false);

    expect(
      shouldRunStartupUpdateCheck({
        config: {},
        env: {},
        installSource: "npx",
        stdoutIsTTY: true,
      }),
    ).toBe(false);
  });

  it("respects config, env, CI, and non-TTY opt-outs", () => {
    expect(
      shouldRunStartupUpdateCheck({
        config: { updateCheck: false },
        env: {},
        installSource: "npm",
        stdoutIsTTY: true,
      }),
    ).toBe(false);

    expect(
      shouldRunStartupUpdateCheck({
        config: {},
        env: { CARBONCODE_NO_UPDATE_CHECK: "1" },
        installSource: "npm",
        stdoutIsTTY: true,
      }),
    ).toBe(false);

    expect(
      shouldRunStartupUpdateCheck({
        config: {},
        env: { CI: "true" },
        installSource: "npm",
        stdoutIsTTY: true,
      }),
    ).toBe(false);

    expect(
      shouldRunStartupUpdateCheck({
        config: {},
        env: {},
        installSource: "npm",
        stdoutIsTTY: false,
      }),
    ).toBe(false);
  });

  it("returns a compact Chinese update hint when npm latest is newer", async () => {
    setLanguageRuntime("zh-CN");

    const hint = await getStartupUpdateHint({
      config: {},
      current: "0.1.1",
      env: {},
      fetchLatest: async () => "0.1.2",
      installSource: "npm",
      stdoutIsTTY: true,
    });

    expect(hint).toContain("有新版本：0.1.1 → 0.1.2");
    expect(hint).toContain("npm install -g @carboncode/cli");
  });

  it("stays quiet when latest is missing or not newer", async () => {
    const common = {
      config: {},
      current: "0.1.1",
      env: {},
      installSource: "npm" as const,
      stdoutIsTTY: true,
    };

    await expect(
      getStartupUpdateHint({ ...common, fetchLatest: async () => null }),
    ).resolves.toBeNull();
    await expect(
      getStartupUpdateHint({ ...common, fetchLatest: async () => "0.1.1" }),
    ).resolves.toBeNull();
    await expect(
      getStartupUpdateHint({ ...common, fetchLatest: async () => "0.1.0" }),
    ).resolves.toBeNull();
  });
});
