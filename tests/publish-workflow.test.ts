import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("npm publish workflow", () => {
  test("publishes scoped public package from version tags using trusted publishing", () => {
    const workflow = readFileSync(resolve(".github/workflows/publish.yml"), "utf8");

    expect(workflow).toContain("tags:");
    expect(workflow).toContain("'v*'");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("registry-url: https://registry.npmjs.org");
    expect(workflow).toContain("package-manager-cache: false");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm publish --access public");
    expect(workflow).not.toContain("NPM_TOKEN");
  });

  test("package lifecycle builds before packing or publishing", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));

    expect(pkg.scripts.prepack).toBe("npm run verify");
  });
});
