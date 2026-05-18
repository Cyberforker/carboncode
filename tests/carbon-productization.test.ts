import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

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
});
