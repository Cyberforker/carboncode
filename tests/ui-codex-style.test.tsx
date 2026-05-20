import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it } from "vitest";
import { BootSplash } from "../src/cli/ui/BootSplash.js";
import { PromptInput } from "../src/cli/ui/PromptInput.js";
import { WelcomeBanner } from "../src/cli/ui/WelcomeBanner.js";
import { CardRenderer } from "../src/cli/ui/cards/CardRenderer.js";
import { ReasoningCard } from "../src/cli/ui/cards/ReasoningCard.js";
import type { ReasoningCard as ReasoningCardData } from "../src/cli/ui/state/cards.js";
import { setLanguageRuntime } from "../src/i18n/index.js";

function settledReasoning(text: string): ReasoningCardData {
  return {
    kind: "reasoning",
    id: "r1",
    ts: 1,
    endedAt: 2001,
    text,
    paragraphs: 1,
    tokens: 64,
    streaming: false,
    model: "deepseek-v4-pro",
  };
}

describe("Codex-style terminal surface", () => {
  it("uses a compact boot splash instead of a full-screen logo scene", () => {
    const { lastFrame, unmount } = render(<BootSplash />);
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("Carbon Code");
    expect(out).not.toContain("████");
    expect(out).not.toContain("_____");
    expect(out).not.toContain("░");
  });

  it("keeps the empty state task-first, not a branded product card", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <WelcomeBanner inCodeMode workspaceRoot="/repo" dashboardUrl={null} />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("Carbon Code");
    expect(out).toContain("/repo");
    expect(out).not.toContain("DeepSeek");
    expect(out).not.toContain("🐋");
    expect(out).not.toContain("/help");
    expect(out).not.toContain("╭");
  });

  it("renders the composer as a quiet prompt without a persistent shortcut button row", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <PromptInput value="" onChange={() => {}} onSubmit={() => {}} />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("›");
    expect(out).toContain("输入任务");
    expect(out).not.toContain("╭");
    expect(out).not.toContain("^U");
    expect(out).not.toContain("^P/^N");
    expect(out).not.toContain("^C");
  });

  it("does not show reasoning body by default", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <ReasoningCard
        card={settledReasoning("Let me read these files and decide what to do next.")}
        expanded={false}
      />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("推理");
    expect(out).not.toContain("Let me read");
  });

  it("keeps normal timeline rendering from expanding reasoning text", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <CardRenderer
        card={settledReasoning("Let me read these files and decide what to do next.")}
      />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("推理");
    expect(out).not.toContain("Let me read");
  });
});
