import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cardShadow, display, ff, font, radius, spacing } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import { formatDiff } from "../utils/format";
import { Avatar, TeamCrest } from "./ui";

// Standings keep every column the web shows (O Q H M TF X): with narrow numeric
// columns they fit a 360pt phone without horizontal scrolling.

export type StandingItem = {
  teamId: number;
  name: string;
  logo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export function StandingsTable({
  rows,
  qualifyCount,
  highlightTeamIds,
  onPressTeam,
}: {
  rows: StandingItem[];
  qualifyCount?: number;
  highlightTeamIds?: Set<number>;
  onPressTeam?: (teamId: number) => void;
}) {
  const styles = useStyles();
  return (
    <View>
      <View style={styles.table}>
        <View style={[styles.row, styles.head]}>
          <Text style={[styles.pos, styles.headText]}>#</Text>
          <Text style={[styles.teamCol, styles.headText]}>Komanda</Text>
          <Text style={[styles.num, styles.headText]}>O</Text>
          <Text style={[styles.num, styles.headText]}>Q</Text>
          <Text style={[styles.num, styles.headText]}>H</Text>
          <Text style={[styles.num, styles.headText]}>M</Text>
          <Text style={[styles.diff, styles.headText]}>TF</Text>
          <Text style={[styles.pts, styles.headText]}>X</Text>
        </View>
        {rows.map((row, index) => (
          <StandingRow
            key={row.teamId}
            row={row}
            position={index + 1}
            qualified={qualifyCount != null ? index < qualifyCount : index === 0}
            mine={highlightTeamIds?.has(row.teamId) ?? false}
            onPress={onPressTeam ? () => onPressTeam(row.teamId) : undefined}
          />
        ))}
      </View>
      <Text style={styles.legend}>O oyun · Q qələbə · H heç-heçə · M məğlubiyyət · TF top fərqi · X xal</Text>
    </View>
  );
}

const StandingRow = memo(function StandingRow({
  row,
  position,
  qualified,
  mine,
  onPress,
}: {
  row: StandingItem;
  position: number;
  qualified: boolean;
  mine: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${position}. ${row.name}, ${row.points} xal, ${row.played} oyun, ${row.goalsFor}:${row.goalsAgainst}`}
      style={({ pressed }) => [styles.row, styles.bodyRow, mine && styles.mine, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.posCell}>
        {qualified ? <View style={styles.stripe} /> : null}
        <Text style={styles.posText}>{position}</Text>
      </View>
      <View style={[styles.teamCol, styles.teamRow]}>
        <TeamCrest name={row.name} logo={row.logo} size={24} />
        <Text style={[styles.teamName, qualified && styles.teamNameStrong]} numberOfLines={1}>
          {row.name}
        </Text>
      </View>
      <Text style={styles.num}>{row.played}</Text>
      <Text style={styles.num}>{row.won}</Text>
      <Text style={styles.num}>{row.drawn}</Text>
      <Text style={styles.num}>{row.lost}</Text>
      <Text style={styles.diff}>{formatDiff(row.goalDiff)}</Text>
      <Text style={[styles.pts, qualified && styles.ptsLeader]}>{row.points}</Text>
    </Pressable>
  );
});

export type PlayerStatItem = {
  id: number;
  name: string;
  photo: string | null;
  teamName: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
};

/** Leader card (first place) followed by the ranked table, like the Bombardirlər mockup. */
export function PlayerStatList({
  rows,
  metric,
  onPressPlayer,
}: {
  rows: PlayerStatItem[];
  metric: "goals" | "assists" | "ga";
  onPressPlayer?: (id: number) => void;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const metricLabel = metric === "goals" ? "qol" : metric === "assists" ? "asist" : "qol + asist";
  const valueOf = (row: PlayerStatItem) => (metric === "goals" ? row.goals : metric === "assists" ? row.assists : row.goals + row.assists);
  const [leader, ...rest] = rows;
  if (!leader) return null;
  return (
    <View style={{ gap: spacing.md }}>
      <Pressable
        onPress={onPressPlayer ? () => onPressPlayer(leader.id) : undefined}
        disabled={!onPressPlayer}
        accessibilityRole={onPressPlayer ? "button" : undefined}
        accessibilityLabel={`Lider: ${leader.name}, ${leader.teamName}, ${valueOf(leader)} ${metricLabel}`}
        style={styles.leader}
      >
        <LinearGradient colors={[c.brandSoft, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.leaderGlow} />
        <Avatar uri={leader.photo} name={leader.name} size={60} />
        <View style={{ flex: 1 }}>
          <Text style={styles.leaderEyebrow}>1-ci yer</Text>
          <Text style={styles.leaderName} numberOfLines={1}>
            {leader.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {leader.teamName} · {leader.matchesPlayed} oyun
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.leaderValue}>{valueOf(leader)}</Text>
          <Text style={styles.sub}>{metricLabel}</Text>
        </View>
      </Pressable>
      {rest.length > 0 ? (
        <View style={styles.table}>
          <View style={[styles.row, styles.head]}>
            <Text style={[styles.pos, styles.headText]}>#</Text>
            <Text style={[styles.teamCol, styles.headText]}>Oyunçu</Text>
            <Text style={[styles.num, styles.headText]}>O</Text>
            <Text style={[styles.pts, styles.headText, { width: 44 }]}>{metric === "goals" ? "Qol" : metric === "assists" ? "Asist" : "Q+A"}</Text>
          </View>
          {rest.map((row, i) => (
            <Pressable
              key={row.id}
              onPress={onPressPlayer ? () => onPressPlayer(row.id) : undefined}
              disabled={!onPressPlayer}
              accessibilityRole={onPressPlayer ? "button" : undefined}
              accessibilityLabel={`${i + 2}. ${row.name}, ${row.teamName}, ${valueOf(row)} ${metricLabel}`}
              style={({ pressed }) => [styles.row, styles.bodyRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.pos}>{i + 2}</Text>
              <View style={[styles.teamCol, styles.teamRow]}>
                <Avatar uri={row.photo} name={row.name} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.teamName, styles.teamNameStrong]} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {row.teamName}
                    {metric === "ga" ? ` · ${row.goals}Q ${row.assists}A` : ""}
                  </Text>
                </View>
              </View>
              <Text style={styles.num}>{row.matchesPlayed}</Text>
              <Text style={[styles.pts, { width: 44 }]}>{valueOf(row)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  table: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
    paddingHorizontal: 6,
    ...cardShadow(c),
  },
  head: { minHeight: 34 },
  headText: { fontSize: 10.5, fontFamily: ff.bold, color: c.textFaint, letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: 2 },
  bodyRow: { minHeight: 46, borderTopWidth: 1, borderTopColor: c.border },
  mine: { backgroundColor: c.brandSoft },
  pos: { width: 24, fontSize: font.sm, fontFamily: ff.bold, color: c.textMuted, textAlign: "center" },
  posCell: { width: 24, height: 46, alignItems: "center", justifyContent: "center" },
  stripe: { position: "absolute", left: 0, top: 11, bottom: 11, width: 3, borderRadius: 2, backgroundColor: c.brand },
  posText: { fontSize: font.sm, fontFamily: ff.bold, color: c.textMuted },
  teamCol: { flex: 1, paddingVertical: 6, paddingRight: 4 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  teamName: { flexShrink: 1, fontSize: 12.5, fontFamily: ff.medium, color: c.text },
  teamNameStrong: { fontFamily: ff.bold, color: c.ink },
  sub: { fontSize: 11, fontFamily: ff.regular, color: c.textFaint, marginTop: 1 },
  num: { width: 22, textAlign: "center", fontSize: 12.5, fontFamily: ff.regular, color: c.text, fontVariant: ["tabular-nums"] },
  diff: { width: 30, textAlign: "center", fontSize: 12.5, fontFamily: ff.regular, color: c.text, fontVariant: ["tabular-nums"] },
  pts: { width: 28, textAlign: "center", fontSize: 13.5, fontFamily: ff.extrabold, color: c.ink, fontVariant: ["tabular-nums"] },
  ptsLeader: { color: c.brandInk },
  legend: { fontSize: 10.5, fontFamily: ff.regular, color: c.textFaint, paddingTop: spacing.sm, paddingHorizontal: 2, lineHeight: 15 },
  leader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing.lg - 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.brandBorder,
    backgroundColor: c.card,
    overflow: "hidden",
  },
  leaderGlow: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
  leaderEyebrow: { fontFamily: ff.bold, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: c.brandInk },
  leaderName: { fontFamily: ff.bold, fontSize: 16, color: c.ink, marginTop: 2 },
  leaderValue: { ...display(44, "extrabold"), lineHeight: 44, color: c.brandInk },
}));
