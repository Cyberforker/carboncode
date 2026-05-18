import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  applyEdit,
  createWorkspaceTools,
  searchContent,
  searchFiles,
} from "../src/tools/filesystem.js";

const roots: string[] = [];

function makeRoot(): string {
  const root = join(tmpdir(), `carbon-fs-${Date.now()}-${Math.random()}`);
  mkdirSync(root, { recursive: true });
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("filesystem tools", () => {
  test("searches filenames and content while skipping dependencies", async () => {
    const root = makeRoot();
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(root, "src", "main.ts"), "const label = 'Carbon';\n", "utf8");
    writeFileSync(join(root, "node_modules", "pkg", "main.ts"), "Carbon\n", "utf8");

    await expect(searchFiles(root, "main")).resolves.toBe("src/main.ts");
    await expect(searchContent(root, "Carbon")).resolves.toContain("src/main.ts:1:");
  });

  test("applies a unique edit and returns a visible diff", async () => {
    const root = makeRoot();
    const path = join(root, "file.ts");
    writeFileSync(path, "export const name = 'Reasonix';\n", "utf8");

    const result = await applyEdit(root, path, {
      search: "Reasonix",
      replace: "Carbon Code",
    });

    expect(readFileSync(path, "utf8")).toBe("export const name = 'Carbon Code';\n");
    expect(result).toContain("edited file.ts");
    expect(result).toContain("- Reasonix");
    expect(result).toContain("+ Carbon Code");
  });

  test("rejects ambiguous edits without writing", async () => {
    const root = makeRoot();
    const path = join(root, "file.ts");
    writeFileSync(path, "same\nsame\n", "utf8");

    await expect(
      applyEdit(root, path, { search: "same", replace: "changed" }),
    ).rejects.toThrow(/multiple times/);
    expect(readFileSync(path, "utf8")).toBe("same\nsame\n");
  });

  test("requires approval before write tools mutate files", async () => {
    const root = makeRoot();
    const path = join(root, "file.ts");
    writeFileSync(path, "hello\n", "utf8");
    const tools = createWorkspaceTools(root, {
      approve: async () => false,
    });

    await expect(
      tools.editFile({ path: "file.ts", search: "hello", replace: "bye" }),
    ).resolves.toContain("用户未批准");
    expect(readFileSync(path, "utf8")).toBe("hello\n");
  });
});
