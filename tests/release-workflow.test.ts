import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(join(process.cwd(), ".github", "workflows", "publish.yml"), "utf8");

describe("npm publish workflow", () => {
  it("publishes @carboncode/cli from semver tags through trusted publishing", () => {
    expect(workflow).toContain("tags:");
    expect(workflow).toContain("'v*.*.*'");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("environment: npm");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).toContain("npm run verify");
    expect(workflow).toContain("GITHUB_REF_NAME#v");
    expect(workflow).toContain("package.json");
    expect(workflow).toContain("npm publish --access public --provenance");
  });
});
