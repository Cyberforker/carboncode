import { Box, useStdout } from "ink";
// biome-ignore lint/style/useImportType: tsconfig jsx=react needs React in value scope for JSX compilation
import React from "react";

export interface ConversationViewportProps {
  history: React.ReactNode | ((metrics: { maxRows: number; totalRows: number }) => React.ReactNode);
  controls: React.ReactNode;
  bottomReserveRows?: number;
}

/**
 * Keeps the active composer attached to the visible conversation tail when the
 * transcript is short, while still capping history when it needs to scroll.
 */
export function ConversationViewport({
  history,
  controls,
  bottomReserveRows = 4,
}: ConversationViewportProps): React.ReactElement {
  const { stdout } = useStdout();
  const totalRows = stdout?.rows ?? 24;
  const maxRows = Math.max(1, totalRows - bottomReserveRows);
  const renderedHistory = typeof history === "function" ? history({ maxRows, totalRows }) : history;

  return (
    <Box flexDirection="row" height={totalRows}>
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" flexShrink={1} maxHeight={maxRows} overflow="hidden">
          {renderedHistory}
        </Box>
        {controls}
        <Box flexGrow={1} />
      </Box>
    </Box>
  );
}
