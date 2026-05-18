import { describe, expect, test } from "vitest";
import { formatApprovalRequest, isApprovalAccepted } from "../src/approval.js";

describe("approval UX", () => {
  test("renders edit approval with diff preview", () => {
    const text = formatApprovalRequest({
      type: "edit",
      path: "src/index.ts",
      preview: "@@\n- old\n+ new",
    });

    expect(text).toContain("准备编辑 src/index.ts");
    expect(text).toContain("@@");
    expect(text).toContain("- old");
    expect(text).toContain("+ new");
  });

  test("requires explicit yes for destructive shell commands", () => {
    expect(isApprovalAccepted("y", { destructive: true })).toBe(false);
    expect(isApprovalAccepted("yes", { destructive: true })).toBe(true);
  });
});
