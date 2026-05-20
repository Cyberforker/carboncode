import { Box, Text } from "ink";
// biome-ignore lint/style/useImportType: tsconfig jsx=react needs React in value scope for JSX compilation
import React from "react";
import { Card } from "../primitives/Card.js";
import type { UserCard as UserCardData } from "../state/cards.js";
import { CARD } from "../theme/tokens.js";

export function UserCard({ card }: { card: UserCardData }): React.ReactElement {
  return (
    <Card tone={CARD.user.color}>
      <Box flexDirection="row" gap={1}>
        <Text bold color={CARD.user.color}>
          ›
        </Text>
        <Text>{card.text}</Text>
      </Box>
    </Card>
  );
}
