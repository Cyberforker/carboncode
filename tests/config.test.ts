import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  defaultConfigPath,
  loadApiKey,
  readConfig,
  writeConfig,
} from "../src/config.js";

const tmpRoots: string[] = [];

function tmpRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "carbon-config-"));
  tmpRoots.push(dir);
  return dir;
}

afterEach(() => {
  delete process.env.DEEPSEEK_API_KEY;
  for (const dir of tmpRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("Carbon config", () => {
  test("uses ~/.carboncode/config.json", () => {
    expect(defaultConfigPath("/Users/example")).toBe(
      "/Users/example/.carboncode/config.json",
    );
  });

  test("reads api key from env before config", () => {
    const path = join(tmpRoot(), "config.json");
    writeConfig({ apiKey: "from-config" }, path);
    process.env.DEEPSEEK_API_KEY = "from-env";

    expect(loadApiKey(path)).toBe("from-env");
  });

  test("writes config with owner-only permissions where supported", () => {
    const path = join(tmpRoot(), "nested", "config.json");
    writeConfig({ apiKey: "secret", profile: "pro" }, path);

    expect(readConfig(path)).toEqual({ apiKey: "secret", profile: "pro" });
    if (process.platform !== "win32") {
      expect(statSync(path).mode & 0o777).toBe(0o600);
    }
  });
});
