import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("package metadata", () => {
  test("publishes Carbon Code commands without shadowing cc", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));

    expect(pkg.name).toBe("@carboncode/cli");
    expect(pkg.bin).toEqual({
      carboncode: "dist/cli/index.js",
      ccode: "dist/cli/index.js",
    });
    expect(pkg.bin).not.toHaveProperty("cc");
    expect(pkg.files).toEqual(
      expect.arrayContaining(["THIRD_PARTY_NOTICES.md", "LICENSES"]),
    );
  });
});
