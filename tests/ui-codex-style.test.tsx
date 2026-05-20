import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it } from "vitest";
import { BootSplash } from "../src/cli/ui/BootSplash.js";
import { EditConfirm } from "../src/cli/ui/EditConfirm.js";
import { PromptInput } from "../src/cli/ui/PromptInput.js";
import { WelcomeBanner } from "../src/cli/ui/WelcomeBanner.js";
import { CardRenderer } from "../src/cli/ui/cards/CardRenderer.js";
import { ReasoningCard } from "../src/cli/ui/cards/ReasoningCard.js";
import { StreamingCard } from "../src/cli/ui/cards/StreamingCard.js";
import { ToolCard } from "../src/cli/ui/cards/ToolCard.js";
import { UserCard } from "../src/cli/ui/cards/UserCard.js";
import { ModeStatusBar, UndoBanner } from "../src/cli/ui/layout/LiveRows.js";
import { StatusRow } from "../src/cli/ui/layout/StatusRow.js";
import type { ReasoningCard as ReasoningCardData } from "../src/cli/ui/state/cards.js";
import { AgentStoreProvider, useAgentStore } from "../src/cli/ui/state/provider.js";
import type { AgentState, SessionInfo } from "../src/cli/ui/state/state.js";
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

const SESSION: SessionInfo = {
  id: "default",
  branch: "main",
  workspace: "/repo",
  model: "deepseek-v4-pro",
};

function StateInjector({
  overrides,
  children,
}: {
  overrides: Partial<AgentState["status"]>;
  children: React.ReactNode;
}): React.ReactElement {
  const store = useAgentStore();
  React.useEffect(() => {
    store.dispatch({ type: "session.update", patch: overrides } as never);
  }, [store, overrides]);
  return <>{children}</>;
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

  it("renders user turns without timestamp chrome", () => {
    const { lastFrame, unmount } = render(
      <UserCard
        card={{
          kind: "user",
          id: "u1",
          ts: Date.now(),
          text: "帮我修改这个函数",
        }}
      />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("帮我修改这个函数");
    expect(out).not.toContain("just now");
    expect(out).not.toContain("◇");
    expect(out).not.toContain("↳");
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
    expect(out).not.toContain("v4-pro");
    expect(out).not.toContain("tok");
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

  it("can render a fully quiet bottom status row", async () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <AgentStoreProvider session={SESSION}>
        <StateInjector overrides={{ cost: 0.01, promptTokens: 2000, preset: "pro" }}>
          <StatusRow
            statusBar={
              {
                showMode: false,
                showPreset: false,
                showSessionInfo: false,
                showBalance: false,
                showSessionCost: false,
                showTurnCost: false,
                showCacheHit: false,
                showCtxUsage: false,
                showVersion: false,
                showFeedbackHint: false,
              } as never
            }
          />
        </StateInjector>
      </AgentStoreProvider>,
    );
    await new Promise((r) => setTimeout(r, 250));
    const out = lastFrame() ?? "";
    unmount();

    expect(out).not.toContain("编辑");
    expect(out).not.toContain("default · main");
    expect(out).not.toContain("pro");
    expect(out).not.toContain("上下文");
  });

  it("keeps streaming output headers free of model and preview chips", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <StreamingCard
        card={{
          kind: "streaming",
          id: "s1",
          ts: Date.now() - 1000,
          text: "@carboncode/cli",
          done: false,
          model: "deepseek-v4-pro",
        }}
      />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("输出");
    expect(out).not.toContain("preview");
    expect(out).not.toContain("expanded");
    expect(out).not.toContain("v4-pro");
    expect(out).not.toContain("t/s");
  });

  it("shows successful read tools as a compact action, not a file preview dump", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <ToolCard
        card={{
          kind: "tool",
          id: "tool1",
          ts: 1,
          name: "read_file",
          args: { path: "package.json" },
          output: ["{", '  "name": "@carboncode/cli",', '  "version": "0.1.0",', "}"].join("\n"),
          done: true,
          exitCode: 0,
          elapsedMs: 20,
        }}
      />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("read_file");
    expect(out).toContain("package.json");
    expect(out).not.toContain("@carboncode/cli");
    expect(out).not.toContain('"version"');
  });

  it("keeps edit review hints compact instead of exposing every mode shortcut", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <EditConfirm
        block={{
          path: "src/cart.js",
          search: "return item.price;",
          replace: "return item.price * item.quantity;",
          offset: 0,
        }}
        onChoose={() => {}}
      />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).toContain("Enter");
    expect(out).not.toContain("应用剩余");
    expect(out).not.toContain("切换 AUTO");
  });

  it("does not show a stale review bar when no edits are pending", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <ModeStatusBar editMode="review" pendingCount={0} flash={false} planMode={false} />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out.trim()).toBe("");
  });

  it("uses a quiet undo banner label instead of AUTO-APPLIED chrome", () => {
    setLanguageRuntime("zh-CN");
    const { lastFrame, unmount } = render(
      <UndoBanner
        banner={{
          results: [{ path: "src/cart.js", status: "applied" }],
          expiresAt: Date.now() + 5000,
          pausedRemainingMs: null,
        }}
      />,
    );
    const out = lastFrame() ?? "";
    unmount();

    expect(out).not.toContain("AUTO-APPLIED");
    expect(out).toContain("已应用");
  });
});
