import { Box, Text, useStdout } from "ink";
// biome-ignore lint/style/useImportType: tsconfig jsx=react needs React in value scope for JSX compilation
import React, { useContext } from "react";
import { clipToCells } from "../../../frame/width.js";
import { t } from "../../../i18n/index.js";
import { countTokensBounded } from "../../../tokenizer.js";
import { LiveExpandContext } from "../layout/LiveExpandContext.js";
import { useReserveRows } from "../layout/viewport-budget.js";
import { Markdown } from "../markdown.js";
import { Card } from "../primitives/Card.js";
import { CardHeader } from "../primitives/CardHeader.js";
import { Spinner } from "../primitives/Spinner.js";
import type { StreamingCard as StreamingCardData } from "../state/cards.js";
import { FG, TONE, TONE_ACTIVE } from "../theme/tokens.js";
import { useSlowTick } from "../ticker.js";
import { useIncrementalWrap } from "./useIncrementalWrap.js";

/** Streaming preview tail length — bounded live region so chunks don't thrash whole-card layout. */
const STREAMING_PREVIEW_LINES = 4;
/** Expanded mode shows up to this many lines so the card can't swallow the whole viewport. */
const EXPANDED_MAX_LINES = 60;

const LIVE_TOKEN_CALIBRATION_CHARS = 1000;
const ESTIMATED_CHARS_PER_TOKEN = 4;

export interface LiveTokenCalibration {
  cardId: string;
  chars: number;
  tokens: number;
}

export function estimateLiveTokenCount(
  text: string,
  cardId: string,
  calibration: LiveTokenCalibration | null,
  countFn: (value: string) => number = countTokensBounded,
): { tokens: number; calibration: LiveTokenCalibration; exact: boolean } {
  const chars = text.length;
  const shouldCalibrate =
    chars > 0 &&
    (!calibration ||
      calibration.cardId !== cardId ||
      chars < calibration.chars ||
      (calibration.chars === 0 && chars > 0) ||
      chars - calibration.chars >= LIVE_TOKEN_CALIBRATION_CHARS);

  if (shouldCalibrate) {
    const tokens = countFn(text);
    return { tokens, calibration: { cardId, chars, tokens }, exact: true };
  }

  const base = calibration?.cardId === cardId && chars >= calibration.chars ? calibration : null;
  const baseChars = base?.chars ?? 0;
  const baseTokens = base?.tokens ?? 0;
  const estimatedDelta = Math.ceil(Math.max(0, chars - baseChars) / ESTIMATED_CHARS_PER_TOKEN);
  return {
    tokens: baseTokens + estimatedDelta,
    calibration: base ?? { cardId, chars: 0, tokens: 0 },
    exact: false,
  };
}

export function StreamingCard({ card }: { card: StreamingCardData }): React.ReactElement {
  const { stdout } = useStdout();
  const cols = stdout?.columns ?? 80;
  const expanded = useContext(LiveExpandContext);
  const reserveCap = expanded ? EXPANDED_MAX_LINES + 2 : STREAMING_PREVIEW_LINES + 2;
  useReserveRows("stream", {
    min: STREAMING_PREVIEW_LINES + 1,
    max: reserveCap,
  });
  // Re-render at 1Hz so the rate keeps updating even when chunks stall.
  // Frozen once `card.done` is true — settled cards render via Static.
  useSlowTick();
  const lineCells = Math.max(20, cols - 4);
  const visualLines = useIncrementalWrap(card.text, lineCells);

  if (card.done && !card.aborted) {
    return (
      <Card tone={TONE.ok}>
        <CardHeader glyph="‹" tone={TONE.ok} title={t("cardTitles.reply")} />
        <Markdown text={card.text} />
      </Card>
    );
  }

  const cap = expanded ? EXPANDED_MAX_LINES : STREAMING_PREVIEW_LINES;
  const visible = visualLines.slice(-cap);
  const droppedAbove = Math.max(0, visualLines.length - visible.length);
  const aborted = !!card.aborted;
  const headColor = aborted ? TONE.err : TONE_ACTIVE.brand;
  const glyph = aborted ? "⊘" : "●";
  const headLabel = aborted ? t("cardLabels.aborted") : t("cardLabels.writing");

  return (
    <Card tone={headColor}>
      <CardHeader
        glyph={glyph}
        tone={headColor}
        title={headLabel}
        right={aborted ? null : <Spinner kind="braille" color={TONE_ACTIVE.brand} />}
      />
      {expanded && droppedAbove > 0 ? (
        <Text color={FG.faint}>
          {t(droppedAbove === 1 ? "cardLabels.earlierLine" : "cardLabels.earlierLines", {
            count: droppedAbove,
          })}
        </Text>
      ) : null}
      {visible.map((line, i) => (
        <Box key={`${card.id}:${visualLines.length - visible.length + i}`} flexDirection="row">
          <Text color={aborted ? FG.meta : FG.body}>{clipToCells(line, lineCells)}</Text>
        </Box>
      ))}
      {aborted ? <Text color={FG.faint}>{t("cardLabels.truncatedByEsc")}</Text> : null}
    </Card>
  );
}
