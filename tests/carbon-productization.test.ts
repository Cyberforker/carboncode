import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { codeSystemBase } from "../src/code/prompt.js";
import { getLanguage, setLanguageRuntime, t } from "../src/i18n/index.js";

const originalLang = getLanguage();

afterAll(() => {
  setLanguageRuntime(originalLang);
});

describe("Carbon broad Reasonix import", () => {
  test("keeps Carbon package identity while importing Reasonix engine surface", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));

    expect(pkg.name).toBe("@carboncode/cli");
    expect(pkg.bin).toEqual({
      carboncode: "dist/cli/index.js",
      ccode: "dist/cli/index.js",
    });
    expect(pkg.bin).not.toHaveProperty("cc");
    expect(pkg.files).toEqual(expect.arrayContaining(["THIRD_PARTY_NOTICES.md", "LICENSES"]));

    expect(existsSync(resolve("src/loop.ts"))).toBe(true);
    expect(existsSync(resolve("src/cli/commands/code.tsx"))).toBe(true);
    expect(existsSync(resolve("src/mcp/client.ts"))).toBe(true);
    expect(existsSync(resolve("src/memory/session.ts"))).toBe(true);
    expect(existsSync(resolve("dashboard/index.html"))).toBe(true);
  });

  test("uses Carbon config path instead of Reasonix config path", () => {
    const config = readFileSync(resolve("src/config.ts"), "utf8");

    expect(config).toContain(".carboncode");
    expect(config).not.toContain(".reasonix");
  });

  test("version and CLI metadata target Carbon Code package", () => {
    const version = readFileSync(resolve("src/version.ts"), "utf8");
    const cli = readFileSync(resolve("src/cli/index.ts"), "utf8");

    expect(version).toContain("registry.npmjs.org/@carboncode/cli/latest");
    expect(version).toContain('pkg?.name === "@carboncode/cli"');
    expect(version).toContain(".carboncode");
    expect(cli).toContain('.name("carboncode")');
    expect(cli).not.toContain('.name("reasonix")');
  });

  test("high-visibility runtime guidance uses Carbon command names", () => {
    setLanguageRuntime("EN");
    expect(t("errors.auth401", { inner: "bad key" })).toContain("`carboncode setup`");
    expect(t("mcpHealth.emptyHint")).toContain("`carboncode mcp install filesystem`");
    expect(t("mcpLifecycle.failedSetupHint")).toContain("`carboncode setup`");

    setLanguageRuntime("zh-CN");
    expect(t("errors.auth401", { inner: "bad key" })).toContain("`carboncode setup`");
    expect(t("mcpHealth.emptyHint")).toContain("`carboncode mcp install filesystem`");
    expect(t("mcpLifecycle.failedSetupHint")).toContain("`carboncode setup`");
  });

  test("code-mode system identity is Carbon Code", () => {
    const prompt = codeSystemBase("deepseek-v4-flash");

    expect(prompt).toContain("You are Carbon Code");
    expect(prompt).not.toContain("You are Reasonix Code");
  });

  test("high-visibility source guidance does not point users at reasonix commands", () => {
    const files = [
      "src/cli/commands/commit.ts",
      "src/cli/commands/mcp.ts",
      "src/cli/commands/run.ts",
      "src/cli/ui/App.tsx",
      "src/cli/ui/McpMarketplace.tsx",
      "src/code/prompt.ts",
      "src/index/semantic/store.ts",
      "src/server/api/submit.ts",
      "src/server/api/permissions.ts",
      "src/server/api/mcp.ts",
      "src/server/api/edit-mode.ts",
      "src/server/api/tools.ts",
      "src/server/api/hooks.ts",
      "src/server/api/semantic.ts",
      "src/server/api/skills.ts",
      "src/skills.ts",
      "src/tools/memory.ts",
      "src/tools/skills.ts",
      "dashboard/src/i18n/en.ts",
      "dashboard/src/i18n/zh-CN.ts",
      "dashboard/src/panels/sessions.ts",
    ];

    for (const file of files) {
      const content = readFileSync(resolve(file), "utf8");
      expect(content, file).not.toMatch(
        /\breasonix (setup|code|chat|mcp|run|stats|commit|dashboard|index|diff|replay)\b/,
      );
    }
  });
});
