import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { SessionStore } from "../src/session.js";

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "carbon-session-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("session store", () => {
  test("saves and resumes named sessions", () => {
    const store = new SessionStore(makeRoot());

    store.save("default", [{ role: "user", content: "你好" }]);

    expect(store.load("default")).toEqual([{ role: "user", content: "你好" }]);
    expect(store.list()).toEqual(["default"]);
  });
});
