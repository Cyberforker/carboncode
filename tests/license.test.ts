import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("license compliance", () => {
  test("ships discoverable Reasonix MIT attribution", () => {
    const notice = readFileSync(resolve("THIRD_PARTY_NOTICES.md"), "utf8");
    const reasonixLicense = readFileSync(
      resolve("LICENSES/DeepSeek-Reasonix-MIT.txt"),
      "utf8",
    );

    expect(notice).toContain("DeepSeek-Reasonix");
    expect(notice).toContain("MIT");
    expect(reasonixLicense).toContain("Copyright (c) 2026 Reasonix Contributors");
    expect(reasonixLicense).toContain("Permission is hereby granted");
  });
});
