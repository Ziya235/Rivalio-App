import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cardShadow, display, ff, font, radius, spacing, type Tone } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import type { Match, MatchStatus } from "../types/match";
import { formatDateTime } from "../utils/format";
import { computeMatchClock, venueOf } from "../utils/matchClock";
import { MATCH_STATUS_LABEL, STAGE_LABEL } from "../utils/status";
import { LivePill, Pill, TeamCrest } from "./ui";

export const MATCH_STATUS_TONE: Record<MatchStatus, Tone> = {
  SCHEDULED: "blue",
  LIVE: "live",
  FINISHED: "gray",
  CANCELLED: "red",
  POSTPONED: "orange",
};

/**
 * Compact match row used in every list (league rounds, groups, playoff).
 * `nowMs` is passed from the list so one timer drives all live clocks.
 */
export const MatchCard = memo(function MatchCard({
  match,
  nowMs,
  onPress,
  showStage,
  highlightTeamIds,
  footer,
}: {
  match: Match;
  nowMs: number;
  onPress?: () => void;
  showStage?: boolean;
  highlightTeamIds?: Set<number>;
  footer?: React.ReactNode;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const scheduled = match.status === "SCHEDULED" || match.status === "POSTPONED";
  const live = match.status === "LIVE";
  const clock = live ? computeMatchClock(match, nowMs) : null;
  const homeWon = match.status === "FINISHED" && match.homeScore > match.awayScore;
  const awayWon = match.status === "FINISHED" && match.awayScore > match.homeScore;
  const label = `${match.homeTeam.name} ${scheduled ? "qarşı" : `${match.homeScore}:${match.awayScore}`} ${match.awayTeam.name}`;
  const stage = showStage && match.stage ? `${STAGE_LABEL[match.stage]} · ` : "";
  const group = match.group?.name ? `${match.group.name} · ` : "";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}. ${MATCH_STATUS_LABEL[match.status]}`}
      style={({ pressed }) => [styles.card, live && styles.cardLive, pressed && { opacity: 0.88 }]}
    >
      <View style={styles.top}>
        {live ? (
          <LivePill label={clock ? `Canlı · ${clock.label}` : "Canlı"} />
        ) : (
          <Pill label={MATCH_STATUS_LABEL[match.status]} tone={MATCH_STATUS_TONE[match.status]} />
        )}
        <Text style={styles.when} numberOfLines={1}>
          {stage}
          {group}
          {formatDateTime(match.scheduledAt)}
        </Text>
      </View>

      <TeamLine
        name={match.homeTeam.name}
        logo={match.homeTeam.logo}
        score={scheduled ? null : match.homeScore}
        strong={homeWon || (live && match.homeScore >= match.awayScore)}
        faded={awayWon}
        highlight={highlightTeamIds?.has(match.homeTeamId)}
      />
      <TeamLine
        name={match.awayTeam.name}
        logo={match.awayTeam.logo}
        score={scheduled ? null : match.awayScore}
        strong={awayWon || (live && match.awayScore > match.homeScore)}
        faded={homeWon}
        highlight={highlightTeamIds?.has(match.awayTeamId)}
      />

      <View style={styles.bottom}>
        <Ionicons name="location-outline" size={13} color={c.textFaint} />
        <Text style={[styles.venue, !match.venue && styles.venueMissing]} numberOfLines={1}>
          {venueOf(match)}
        </Text>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={c.textFaint} /> : null}
      </View>
      {footer}
    </Pressable>
  );
});

function TeamLine({
  name,
  logo,
  score,
  strong,
  faded,
  highlight,
}: {
  name: string;
  logo: string | null;
  score: number | null;
  strong: boolean;
  faded: boolean;
  highlight?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.teamLine}>
      <TeamCrest name={name} logo={logo} size={28} />
      <Text style={[styles.team, strong && styles.teamStrong, faded && styles.faded, highlight && styles.teamHighlight]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.score, faded && styles.faded, score == null && styles.scoreEmpty]}>{score ?? "–"}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md + 2,
    gap: 10,
    ...cardShadow(c),
  },
  cardLive: { borderColor: c.brandBorder },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  when: { flex: 1, fontSize: font.xs, color: c.textMuted, fontFamily: ff.medium, textAlign: "right" },
  teamLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  team: { flex: 1, fontSize: 14, color: c.text, fontFamily: ff.medium },
  teamStrong: { color: c.ink, fontFamily: ff.bold },
  teamHighlight: { color: c.brandInk },
  faded: { color: c.textMuted },
  score: { ...display(22, "extrabold"), color: c.ink, minWidth: 22, textAlign: "right", fontVariant: ["tabular-nums"] },
  scoreEmpty: { color: c.textFaint },
  bottom: { flexDirection: "row", alignItems: "center", gap: 4 },
  venue: { flex: 1, fontSize: font.xs, fontFamily: ff.regular, color: c.textFaint },
  venueMissing: { color: c.amber },
}));
