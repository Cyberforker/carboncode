import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { loadProjectRules } from "../src/rules.js";

const roots: string[] = [];

function makeRoot(): string {
  const root = join(tmpdir(), `carbon-rules-${Date.now()}-${Math.random()}`);
  mkdirSync(root, { recursive: true });
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("project rules", () => {
  test("loads CARBON.md before AGENTS.md with source labels", async () => {
    const root = makeRoot();
    writeFileSync(join(root, "CARBON.md"), "Carbon rules", "utf8");
    writeFileSync(join(root, "AGENTS.md"), "Agent rules", "utf8");

    await expect(loadProjectRules(root)).resolves.toEqual([
      { path: "CARBON.md", content: "Carbon rules" },
      { path: "AGENTS.md", content: "Agent rules" },
    ]);
  });
});
