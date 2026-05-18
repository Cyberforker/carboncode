import { describe, expect, test } from "vitest";
import { runApprovedShellCommand } from "../src/tools/shell.js";

describe("shell approvals", () => {
  test("does not run without explicit approval", async () => {
    const result = await runApprovedShellCommand("node -e \"process.stdout.write('ran')\"", {
      cwd: process.cwd(),
      approve: async () => false,
    });

    expect(result.approved).toBe(false);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("用户未批准");
  });

  test("runs approved commands and captures output", async () => {
    const result = await runApprovedShellCommand("node -e \"process.stdout.write('ran')\"", {
      cwd: process.cwd(),
      approve: async () => true,
    });

    expect(result).toMatchObject({ approved: true, exitCode: 0, stdout: "ran" });
  });
});
