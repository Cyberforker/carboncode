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

  test("protocol-facing runtime identities are Carbon-branded", () => {
    const acp = readFileSync(resolve("src/cli/commands/acp.ts"), "utf8");
    const mcpClient = readFileSync(resolve("src/mcp/client.ts"), "utf8");
    const dashboardErrorBoundary = readFileSync(
      resolve("dashboard/src/lib/error-boundary.ts"),
      "utf8",
    );
    const slashCommands = readFileSync(resolve("src/cli/ui/slash/commands.ts"), "utf8");
    const mcpCatalog = readFileSync(resolve("src/mcp/catalog.ts"), "utf8");

    expect(acp).toContain('source: "carboncode acp"');
    expect(acp).toContain('agentInfo: { name: "carboncode", title: "Carbon Code"');
    expect(mcpClient).toContain('clientInfo = opts.clientInfo ?? { name: "carboncode"');
    expect(dashboardErrorBoundary).toContain("https://github.com/Yapie0/carboncode");
    expect(slashCommands).toContain("~/.carboncode/config.json");
    expect(mcpCatalog).toContain("debugging your Carbon Code setup");
  });

  test("desktop visible surfaces are Carbon-branded", () => {
    const tauri = readFileSync(resolve("desktop/src-tauri/tauri.conf.json"), "utf8");
    const desktopEn = readFileSync(resolve("desktop/src/i18n/en.ts"), "utf8");
    const desktopZh = readFileSync(resolve("desktop/src/i18n/zh-CN.ts"), "utf8");
    const about = readFileSync(resolve("desktop/src/ui/about.tsx"), "utf8");
    const indexHtml = readFileSync(resolve("desktop/index.html"), "utf8");

    expect(tauri).toContain('"productName": "Carbon Code"');
    expect(tauri).toContain('"title": "Carbon Code"');
    expect(tauri).toContain("github.com/Yapie0/carboncode");
    expect(desktopEn).toContain("About Carbon Code");
    expect(desktopEn).toContain("Carbon Code v{version}");
    expect(desktopZh).toContain("关于 Carbon Code");
    expect(desktopZh).toContain("Carbon Code v{version}");
    expect(about).toContain('<div className="about-name">Carbon Code</div>');
    expect(about).toContain("Yapie0/carboncode");
    expect(indexHtml).toContain("<title>Carbon Code</title>");
  });

  test("CLI startup and empty-session branding uses Carbon Code", () => {
    const bootSplash = readFileSync(resolve("src/cli/ui/BootSplash.tsx"), "utf8");
    const welcomeBanner = readFileSync(resolve("src/cli/ui/WelcomeBanner.tsx"), "utf8");
    const externalEditor = readFileSync(resolve("src/cli/edit/external-editor.ts"), "utf8");
    const commitCommand = readFileSync(resolve("src/cli/commands/commit.ts"), "utf8");

    expect(bootSplash).toContain("CARBON CODE");
    expect(bootSplash).not.toContain("REASONIX");
    expect(welcomeBanner).toContain('{"Carbon Code"}');
    expect(welcomeBanner).not.toContain("REASONIX");
    expect(externalEditor).toContain("CARBON_INPUT.md");
    expect(externalEditor).not.toContain("REASONIX_INPUT.md");
    expect(externalEditor).toContain("carboncode-compose-");
    expect(commitCommand).toContain("carboncode-commit-");
  });

  test("code-mode system identity is Carbon Code", () => {
    const prompt = codeSystemBase("deepseek-v4-flash");

    expect(prompt).toContain("You are Carbon Code");
    expect(prompt).not.toMatch(/\bReasonix\b|\bREASONIX\b|\breasonix\b/);
  });

  test("dashboard static shell labels are Carbon-branded", () => {
    const appBundle = readFileSync(resolve("dashboard/app.js"), "utf8");
    const indexHtml = readFileSync(resolve("dashboard/index.html"), "utf8");
    const memoryPanel = readFileSync(resolve("dashboard/src/panels/memory.ts"), "utf8");

    expect(appBundle).toContain("CARBON CODE");
    expect(appBundle).not.toContain("REASONIX");
    expect(indexHtml).toContain("carboncode-token");
    expect(indexHtml).not.toContain("reasonix-token");
    expect(memoryPanel).toContain("CARBON.md");
    expect(memoryPanel).not.toContain("REASONIX.md");
  });

  test("new-user model defaults expose official DeepSeek V4 API model IDs", () => {
    const presets = readFileSync(resolve("src/cli/ui/presets.ts"), "utf8");
    expect(presets).toContain('model: "deepseek-v4-flash"');
    expect(presets).toContain('model: "deepseek-v4-pro"');

    const qq = readFileSync(resolve("src/qq/use-qq-channel.ts"), "utf8");
    expect(qq).toContain('"deepseek-v4-flash"');
    expect(qq).toContain('"deepseek-v4-pro"');
    expect(qq).not.toContain('"deepseek-chat"');
    expect(qq).not.toContain('"deepseek-reasoner"');
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

  test("published Markdown docs use Carbon command names", () => {
    const docs = [
      "docs/CLI-REFERENCE.md",
      "docs/qq-connect.md",
      "docs/qq-connect.zh-CN.md",
      "desktop/SIGNING.md",
    ];

    for (const file of docs) {
      const content = readFileSync(resolve(file), "utf8");
      expect(content, file).toContain("Carbon");
      expect(content, file).not.toMatch(/\breasonix\b/);
      expect(content, file).not.toMatch(/\bReasonix\b/);
      expect(content, file).not.toContain("~/.reasonix");
    }
  });
});
