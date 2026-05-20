/** Empty-session welcome block — compact, task-first, and quiet. */

import { Box, Text } from "ink";
// biome-ignore lint/style/useImportType: tsconfig jsx=react needs React in value scope for JSX compilation
import React from "react";
import { t } from "../../i18n/index.js";
import { FG, TONE } from "./theme/tokens.js";

export interface WelcomeBannerProps {
  /** True when running `carboncode code`. Surfaces code-mode hints. */
  inCodeMode?: boolean;
  /** Pinned workspace root — only meaningful in code mode. Surfaced so first-time users see they can pass --dir at next launch. */
  workspaceRoot?: string;
  /** Live URL of the embedded dashboard, or null when it isn't running. */
  dashboardUrl?: string | null;
  /** Bumped on language change; forces re-render so t() picks up new locale. */
  languageVersion?: number;
}

export function WelcomeBanner({
  inCodeMode,
  workspaceRoot,
}: WelcomeBannerProps): React.ReactElement {
  const tagline = inCodeMode ? t("ui.taglineCode") : t("ui.taglineChat");

  return (
    <Box flexDirection="column" marginY={1} paddingX={1}>
      <Box flexDirection="row" gap={1}>
        <Text color={TONE.brand} bold>
          {"Carbon Code"}
        </Text>
        <Text color={FG.meta}>{tagline}</Text>
      </Box>
      {inCodeMode && workspaceRoot ? (
        <Box flexDirection="row" gap={1}>
          <Text color={FG.meta}>{t("welcomeBanner.workspace")}</Text>
          <Text color={FG.faint}>{"·"}</Text>
          <Text color={FG.body}>{workspaceRoot}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
