import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildEditToolBlocks } from "../src/cli/ui/edit-tool-gate.js";

describe("edit tool gate", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "carbon-edit-gate-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("does not intercept read-only tools", () => {
    expect(buildEditToolBlocks("read_file", { path: "src/a.ts" }, root)).toBeNull();
  });

  it("turns multi_edit calls into reviewable edit blocks", () => {
    const blocks = buildEditToolBlocks(
      "multi_edit",
      {
        edits: [
          { path: "src/a.ts", search: "old", replace: "new" },
          { path: "src/b.ts", search: "before", replace: "after" },
        ],
      },
      root,
    );

    expect(blocks).toEqual([
      { path: "src/a.ts", search: "old", replace: "new", offset: 0 },
      { path: "src/b.ts", search: "before", replace: "after", offset: 0 },
    ]);
  });

  it("keeps empty multi_edit searches so new-file edits go through review", () => {
    const blocks = buildEditToolBlocks(
      "multi_edit",
      { edits: [{ path: "src/new.ts", search: "", replace: "export const x = 1;\n" }] },
      root,
    );

    expect(blocks).toEqual([
      { path: "src/new.ts", search: "", replace: "export const x = 1;\n", offset: 0 },
    ]);
  });

  it("normalizes absolute in-root paths before showing the review", async () => {
    await writeFile(join(root, "a.ts"), "old");
    const blocks = buildEditToolBlocks(
      "edit_file",
      { path: resolve(root, "a.ts"), search: "old", replace: "new" },
      root,
    );

    expect(blocks).toEqual([{ path: "a.ts", search: "old", replace: "new", offset: 0 }]);
  });
});
