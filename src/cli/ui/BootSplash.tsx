import { Box, Text } from "ink";
// biome-ignore lint/style/useImportType: tsconfig jsx=react needs React in value scope for JSX compilation
import React from "react";
import { t } from "../../i18n/index.js";
import { FG, TONE } from "./theme/tokens.js";

export function BootSplash(): React.ReactElement {
  return (
    <Box flexDirection="row" gap={1} marginY={1}>
      <Text bold color={TONE.brand}>
        Carbon Code
      </Text>
      <Text color={FG.meta}>{t("common.loading")}</Text>
    </Box>
  );
}
