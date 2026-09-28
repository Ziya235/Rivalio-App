import { View } from "react-native";
import { MatchCard } from "../../components/MatchCard";
import { Button, Row } from "../../components/ui";
import { spacing } from "../../theme";
import type { Match } from "../../types/match";
import { canEditSchedule, isFixtureReady } from "../../utils/matchClock";

/**
 * Admin fixture row: set time/venue while the match hasn't started, and open
 * the match console once it is ready (or already live/finished).
 */
export function AdminMatchRow({
  match,
  nowMs,
  readOnly,
  onSchedule,
  onEnter,
}: {
  match: Match;
  nowMs: number;
  readOnly: boolean;
  onSchedule: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  const schedulable = !readOnly && canEditSchedule(match);
  const ready = isFixtureReady(match);
  const enterable = readOnly || !canEditSchedule(match) || ready;
  return (
    <MatchCard
      match={match}
      nowMs={nowMs}
      showStage={Boolean(match.stage && match.stage !== "GROUP_STAGE")}
      onPress={enterable ? () => onEnter(match) : schedulable ? () => onSchedule(match) : undefined}
      footer={
        <Row style={{ marginTop: spacing.xs }}>
          {schedulable ? (
            <Button
              title="Vaxt və məkan"
              icon="time-outline"
              size="sm"
              variant={ready ? "soft" : "primary"}
              onPress={() => onSchedule(match)}
              style={{ flex: 1 }}
            />
          ) : null}
          {enterable || schedulable ? (
            <Button
              title="Oyuna gir"
              iconRight="arrow-forward"
              size="sm"
              variant="secondary"
              disabled={!enterable}
              onPress={() => onEnter(match)}
              style={{ flex: 1 }}
            />
          ) : (
            <View />
          )}
        </Row>
      }
    />
  );
}
