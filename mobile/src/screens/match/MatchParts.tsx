import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MATCH_STATUS_TONE } from "../../components/MatchCard";
import { LivePill, Pill, TeamCrest } from "../../components/ui";
import { display, ff, font, radius, spacing, type Palette } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { Match, MatchEvent } from "../../types/match";
import { formatLongDateTime, roundLabel } from "../../utils/format";
import { type MatchClock, venueOf } from "../../utils/matchClock";
import { MATCH_STATUS_LABEL, STAGE_LABEL } from "../../utils/status";

export function MatchScoreboard({ match, clock }: { match: Match; clock: MatchClock | null }) {
  const { c } = useTheme();
  const styles = useStyles();
  const scheduled = match.status === "SCHEDULED" || match.status === "POSTPONED";
  const live = match.status === "LIVE";
  const context = match.stage ? STAGE_LABEL[match.stage] : roundLabel(match.round);
  const competition = match.league?.name ?? match.championship?.name ?? null;
  return (
    <View style={styles.board}>
      {live ? <LinearGradient colors={["rgba(239,68,68,0.14)", "transparent"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.8 }} style={StyleSheet.absoluteFill} /> : null}
      <Text style={styles.context} numberOfLines={1}>
        {[competition, match.group?.name, context].filter(Boolean).join(" · ")}
      </Text>
      {live ? (
        <LivePill label={clock ? `LIVE ${clock.label}` : "LIVE"} />
      ) : (
        <Pill label={MATCH_STATUS_LABEL[match.status]} tone={MATCH_STATUS_TONE[match.status]} icon={match.status === "FINISHED" ? "flag-outline" : undefined} />
      )}
      <View style={styles.teams}>
        <View style={styles.side}>
          <TeamCrest name={match.homeTeam.name} logo={match.homeTeam.logo} size={60} />
          <Text style={styles.teamName} numberOfLines={2}>
            {match.homeTeam.name}
          </Text>
        </View>
        <Text
          style={[styles.score, scheduled && { color: c.textFaint }]}
          accessibilityLabel={scheduled ? "Oyun başlamayıb" : `Hesab ${match.homeScore} - ${match.awayScore}`}
        >
          {scheduled ? "VS" : `${match.homeScore} : ${match.awayScore}`}
        </Text>
        <View style={styles.side}>
          <TeamCrest name={match.awayTeam.name} logo={match.awayTeam.logo} size={60} />
          <Text style={styles.teamName} numberOfLines={2}>
            {match.awayTeam.name}
          </Text>
        </View>
      </View>
      <View style={styles.metaLine}>
        <Ionicons name="calendar-outline" size={13} color={c.textMuted} />
        <Text style={styles.meta}>{formatLongDateTime(match.scheduledAt)}</Text>
      </View>
      <View style={styles.metaLine}>
        <Ionicons name="location-outline" size={13} color={match.venue ? c.textMuted : c.amber} />
        <Text style={[styles.meta, !match.venue && { color: c.amber }]}>{venueOf(match)}</Text>
      </View>
    </View>
  );
}

function playerLabel(p: MatchEvent["player"]): string {
  return p ? `${p.firstName} ${p.lastName}`.trim() : "";
}

export function eventTitle(type: MatchEvent["type"]): string {
  switch (type) {
    case "GOAL":
      return "Qol";
    case "OWN_GOAL":
      return "Avtoqol";
    case "YELLOW_CARD":
      return "Sarı kart";
    case "RED_CARD":
      return "Qırmızı kart";
    case "SUBSTITUTION":
      return "Dəyişiklik";
    default:
      return "Qeyd";
  }
}

function eventIcon(c: Palette, type: MatchEvent["type"]): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case "GOAL":
      return { icon: "football", color: c.brandInk };
    case "OWN_GOAL":
      return { icon: "football", color: c.red };
    case "YELLOW_CARD":
      return { icon: "square", color: "#FACC15" };
    case "RED_CARD":
      return { icon: "square", color: "#EF4444" };
    case "SUBSTITUTION":
      return { icon: "swap-horizontal", color: c.sky };
    default:
      return { icon: "document-text-outline", color: c.textMuted };
  }
}

export function eventDetail(event: MatchEvent): string {
  if (event.type === "SUBSTITUTION") return `${playerLabel(event.playerOut) || "—"} → ${playerLabel(event.playerIn) || "—"}`;
  if (event.type === "NOTE") return event.note || "Qeyd";
  return playerLabel(event.player) || "—";
}

/** Second line under the player: the assist for goals, otherwise the event type. */
function eventSub(event: MatchEvent): string {
  if (event.type === "GOAL" && event.assistPlayer) return `Asist: ${playerLabel(event.assistPlayer)}`;
  return eventTitle(event.type);
}

/**
 * Two-sided timeline around a centre line: home events on the left, away on the
 * right, minute bubble in the middle. Events without a team span the centre.
 */
export function EventsTimeline({
  match,
  onPressEvent,
}: {
  match: Match;
  onPressEvent?: (event: MatchEvent) => void;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const events = [...(match.events ?? [])].sort((a, b) => b.minute - a.minute || b.id - a.id);
  if (events.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.empty}>Hələ hadisə yoxdur.</Text>
      </View>
    );
  }
  return (
    <View style={styles.timelineCard}>
      <View style={styles.centerLine} />
      {events.map((event) => {
        const away = event.teamId === match.awayTeamId;
        const home = event.teamId === match.homeTeamId;
        const { icon, color } = eventIcon(c, event.type);
        const sub = eventSub(event);
        const teamName = event.team?.name ?? (away ? match.awayTeam.name : home ? match.homeTeam.name : "");
        const content = (
          <View style={[styles.eventContent, away ? styles.alignStart : styles.alignEnd]}>
            <View style={[styles.eventHead, away && { flexDirection: "row-reverse" }]}>
              <Text style={styles.eventWho} numberOfLines={2}>
                {eventDetail(event)}
              </Text>
              <Ionicons name={icon} size={14} color={color} />
            </View>
            {sub ? <Text style={[styles.eventSub, away ? { textAlign: "left" } : { textAlign: "right" }]}>{sub}</Text> : null}
          </View>
        );
        return (
          <Pressable
            key={event.id}
            disabled={!onPressEvent}
            onPress={() => onPressEvent?.(event)}
            accessibilityRole={onPressEvent ? "button" : undefined}
            accessibilityLabel={`${event.minute}-ci dəqiqə, ${eventTitle(event.type)}, ${eventDetail(event)}, ${teamName}`}
            style={({ pressed }) => [styles.event, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.sideCol}>{!away ? content : null}</View>
            <View style={styles.minute}>
              <Text style={styles.minuteText}>{event.minute}'</Text>
            </View>
            <View style={styles.sideCol}>{away ? content : null}</View>
          </Pressable>
        );
      })}
      {onPressEvent ? <Text style={styles.hint}>Dəyişmək və ya silmək üçün hadisəyə toxunun</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  board: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  context: { fontSize: font.xs, fontFamily: ff.medium, color: c.textMuted, textAlign: "center" },
  teams: { flexDirection: "row", alignItems: "flex-start", alignSelf: "stretch", marginVertical: 6 },
  side: { flex: 1, alignItems: "center", gap: 8 },
  teamName: { fontSize: 13.5, fontFamily: ff.bold, color: c.ink, textAlign: "center" },
  score: { ...display(52, "extrabold"), lineHeight: 58, color: c.ink, minWidth: 110, textAlign: "center", paddingTop: 2 },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 12.5, fontFamily: ff.regular, color: c.textMuted },
  emptyCard: { padding: spacing.xl, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
  empty: { color: c.textMuted, textAlign: "center", fontFamily: ff.regular },
  timelineCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    gap: 14,
  },
  centerLine: { position: "absolute", top: 12, bottom: 12, left: "50%", width: 1, marginLeft: -0.5, backgroundColor: c.borderStrong },
  event: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40 },
  sideCol: { flex: 1 },
  eventContent: { gap: 2 },
  alignEnd: { alignItems: "flex-end" },
  alignStart: { alignItems: "flex-start" },
  eventHead: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%" },
  eventWho: { flexShrink: 1, fontSize: 13, fontFamily: ff.semibold, color: c.ink },
  eventSub: { fontSize: 11.5, fontFamily: ff.regular, color: c.textFaint },
  minute: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.cardMuted,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  minuteText: { fontFamily: ff.bold, fontSize: 11.5, color: c.ink, fontVariant: ["tabular-nums"] },
  hint: { fontFamily: ff.regular, fontSize: 11, color: c.textFaint, textAlign: "center", marginTop: 2 },
}));
