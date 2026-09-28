import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ChipBar } from "../../components/ChipBar";
import { MatchCard } from "../../components/MatchCard";
import { RoundPager } from "../../components/RoundPager";
import { EmptyState } from "../../components/states";
import { PlayerStatList, StandingsTable, type StandingItem } from "../../components/tables";
import { Card, Meta, Muted, Pill, ProgressBar, Row, SectionTitle, TeamCrest } from "../../components/ui";
import { display, ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { Championship, ChampionshipPlayerStat, GroupStandingsBlock } from "../../types/championship";
import type { Match } from "../../types/match";
import { formatDate } from "../../utils/format";
import { buildRounds, groupStageRounds, playoffColumns, type PlayoffColumn } from "../../utils/rounds";
import {
  championshipPhase,
  formatLabel,
  PHASE_LABEL,
  PHASE_TONE,
  STAGE_LABEL,
  visibilityLabel,
} from "../../utils/status";

export type ChampTab = "overview" | "groups" | "matches" | "playoff" | "stats";

export function championshipTabs(c: Championship): { key: ChampTab; label: string }[] {
  const tabs: { key: ChampTab; label: string }[] = [{ key: "overview", label: "İcmal" }];
  if (c.format === "GROUP_AND_PLAYOFF" || c.groups.length > 0) tabs.push({ key: "groups", label: "Qruplar" });
  tabs.push({ key: "matches", label: "Bütün oyunlar" });
  tabs.push({ key: "playoff", label: "Pley-off" });
  tabs.push({ key: "stats", label: "Statistika" });
  return tabs;
}

type MatchRenderer = (match: Match) => React.ReactNode;

export function ChampionshipHeaderCard({ championship: c }: { championship: Championship }) {
  const theme = useTheme();
  const styles = useStyles();
  const phase = championshipPhase(c.status);
  const stage = c.currentStage ? STAGE_LABEL[c.currentStage] : c.status === "GROUP_STAGE" ? STAGE_LABEL.GROUP_STAGE : c.status === "PLAYOFF" ? "Pley-off" : null;
  const progress = c.progress;
  return (
    <View style={styles.header}>
      <LinearGradient colors={[theme.c.violetSoft, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 0.9 }} style={StyleSheet.absoluteFill} />
      <Row gap={6} style={{ flexWrap: "wrap" }}>
        <Pill label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} />
        <Pill label={visibilityLabel(c.visibility)} tone={c.visibility === "PUBLIC" ? "blue" : "violet"} icon={c.visibility === "PUBLIC" ? "globe-outline" : "lock-closed"} />
        {stage ? <Pill label={stage} tone="violet" /> : null}
      </Row>
      <Row gap={spacing.md} style={{ marginTop: 10 }}>
        {c.logo ? <TeamCrest name={c.name} logo={c.logo} size={48} /> : null}
        <Text style={[styles.title, { flex: 1 }]} accessibilityRole="header">
          {c.name}
        </Text>
      </Row>
      <View style={styles.metaRow}>
        <Meta icon="people-outline" text={`${c.teamCount} komanda${c.groups.length ? ` · ${c.groups.length} qrup` : ""}`} />
        {c.startDate ? <Meta icon="calendar-outline" text={formatDate(c.startDate)} /> : null}
      </View>
      <Muted style={{ marginTop: 6 }}>{c.description || `${formatLabel(c.format, c.matchFormat)} · ${c.matchCount} oyun`}</Muted>
      {progress && progress.total > 0 ? (
        <View style={{ marginTop: spacing.md, gap: 6 }}>
          <ProgressBar value={progress.finished / progress.total} />
          <Text style={styles.progressText}>
            {progress.finished}/{progress.total} oyun bitib{progress.live > 0 ? ` · ${progress.live} canlı` : ""}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function standingItems(block: GroupStandingsBlock): StandingItem[] {
  return block.standings.map((r) => ({
    teamId: r.teamId,
    name: r.team.name,
    logo: r.team.logo,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDiff: r.goalDiff,
    points: r.points,
  }));
}

/** Overview: live matches, current round (or playoff stage) + compact group tables. */
export function OverviewView({
  championship,
  matches,
  standings,
  renderMatch,
  myTeamIds,
}: {
  championship: Championship;
  matches: Match[];
  standings: GroupStandingsBlock[];
  renderMatch: MatchRenderer;
  myTeamIds?: Set<number>;
}) {
  const styles = useStyles();
  const liveMatches = matches.filter((m) => m.status === "LIVE");
  const playoff = playoffColumns(matches, championship.status, championship.currentStage);
  const currentPlayoff = playoff.find((c) => c.current);
  const groupRounds = groupStageRounds(matches);
  const currentGroupRound = groupRounds.find((r) => r.status === "current");
  const focus = currentPlayoff
    ? { label: currentPlayoff.label, matches: currentPlayoff.matches }
    : currentGroupRound
      ? { label: currentGroupRound.label, matches: currentGroupRound.matches }
      : null;

  return (
    <View>
      {playoff.length > 0 ? (
        <>
          <SectionTitle>Turnir yolu</SectionTitle>
          <Bracket columns={playoff} finished={championship.status === "FINISHED" || championship.status === "COMPLETED"} />
        </>
      ) : null}
      {liveMatches.length > 0 ? (
        <>
          <SectionTitle count={liveMatches.length}>Canlı oyunlar</SectionTitle>
          <View style={styles.stack}>{liveMatches.map((m) => <View key={m.id}>{renderMatch(m)}</View>)}</View>
        </>
      ) : null}
      {focus ? (
        <>
          <SectionTitle>{focus.label}</SectionTitle>
          <View style={styles.stack}>{focus.matches.map((m) => <View key={m.id}>{renderMatch(m)}</View>)}</View>
        </>
      ) : matches.length === 0 ? (
        <EmptyState icon="calendar-outline" title="Hələ oyun yoxdur" description="Çempionat başladıqdan sonra oyunlar burada görünəcək." />
      ) : null}
      {standings.length > 0 ? (
        <>
          <SectionTitle>Qrup cədvəlləri</SectionTitle>
          <View style={{ gap: spacing.lg }}>
            {standings.map((block) => (
              <View key={block.groupId}>
                <Text style={styles.groupName}>{block.groupName}</Text>
                <StandingsTable rows={standingItems(block)} qualifyCount={block.qualifyCount} highlightTeamIds={myTeamIds} />
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Groups: pick a group → its table and its rounds. */
export function GroupsView({
  championship,
  standings,
  matches,
  renderMatch,
  myTeamIds,
}: {
  championship: Championship;
  standings: GroupStandingsBlock[];
  matches: Match[];
  renderMatch: MatchRenderer;
  myTeamIds?: Set<number>;
}) {
  const styles = useStyles();
  const groups = [...championship.groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const [groupId, setGroupId] = useState<number | null>(groups[0]?.id ?? null);
  const activeId = groups.some((g) => g.id === groupId) ? groupId : groups[0]?.id ?? null;
  const block = standings.find((s) => s.groupId === activeId);
  const group = groups.find((g) => g.id === activeId);
  const rounds = useMemo(() => buildRounds(matches.filter((m) => m.groupId === activeId && (!m.stage || m.stage === "GROUP_STAGE"))), [matches, activeId]);

  if (groups.length === 0) return <EmptyState icon="grid-outline" title="Qruplar hələ yaradılmayıb" />;

  return (
    <View>
      <View style={{ marginHorizontal: -spacing.lg, marginTop: -spacing.sm }}>
        <ChipBar
          variant="chips"
          items={groups.map((g) => ({ key: String(g.id), label: g.name }))}
          active={String(activeId)}
          onChange={(key) => setGroupId(Number(key))}
        />
      </View>
      {block && block.standings.length > 0 ? (
        <StandingsTable rows={standingItems(block)} qualifyCount={block.qualifyCount ?? group?.qualifyCount} highlightTeamIds={myTeamIds} />
      ) : group ? (
        <Card>
          {group.teams.length === 0 ? (
            <Muted>Qrupda komanda yoxdur</Muted>
          ) : (
            group.teams.map((t) => (
              <Row key={t.id} style={{ minHeight: 40 }}>
                <TeamCrest name={t.team.name} logo={t.team.logo} size={26} />
                <Text style={styles.teamName}>{t.team.name}</Text>
              </Row>
            ))
          )}
        </Card>
      ) : null}
      <Muted style={{ marginTop: spacing.xs, fontSize: 11.5 }}>Lime xətt — pley-offa keçid zonası</Muted>
      {rounds.length > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <RoundPager rounds={rounds} renderMatch={renderMatch} />
        </View>
      ) : null}
    </View>
  );
}

/** All matches, one round/stage at a time. */
export function AllMatchesView({ matches, renderMatch }: { matches: Match[]; renderMatch: MatchRenderer }) {
  const rounds = useMemo(() => buildRounds(matches), [matches]);
  if (rounds.length === 0) return <EmptyState icon="football-outline" title="Hələ oyun yoxdur" />;
  return <RoundPager rounds={rounds} renderMatch={renderMatch} />;
}

/** Compact horizontal bracket ("Turnir yolu"): stage columns ending with the champion. */
function Bracket({ columns, finished }: { columns: PlayoffColumn[]; finished: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  const final = columns.find((col) => col.stage === "FINAL")?.matches[0];
  const champion =
    finished && final && final.status === "FINISHED" && final.homeScore !== final.awayScore
      ? final.homeScore > final.awayScore
        ? final.homeTeam
        : final.awayTeam
      : null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }} contentContainerStyle={styles.bracket}>
      {columns.map((col) => (
        <View key={col.stage} style={styles.round}>
          <Text style={[styles.roundLabel, col.current && { color: c.brandInk }]}>{col.label}</Text>
          <View style={styles.roundStack}>
            {col.matches.map((m) => {
              const done = m.status === "FINISHED";
              const homeWin = done && m.homeScore > m.awayScore;
              const awayWin = done && m.awayScore > m.homeScore;
              return (
                <View key={m.id} style={[styles.box, m.status === "LIVE" && styles.boxLive]}>
                  {[
                    { team: m.homeTeam, score: m.homeScore, win: homeWin, lose: awayWin },
                    { team: m.awayTeam, score: m.awayScore, win: awayWin, lose: homeWin },
                  ].map((side, i) => (
                    <View key={i} style={[styles.boxRow, i > 0 && styles.boxBorder]}>
                      <TeamCrest name={side.team.name} logo={side.team.logo} size={20} />
                      <Text style={[styles.boxTeam, side.win && styles.boxWin, side.lose && styles.boxLose]} numberOfLines={1}>
                        {side.team.name}
                      </Text>
                      <Text style={[styles.boxScore, side.lose && styles.boxLose]}>{m.status === "SCHEDULED" || m.status === "POSTPONED" ? "–" : side.score}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </View>
      ))}
      <View style={[styles.round, { width: 110 }]}>
        <Text style={styles.roundLabel}>Çempion</Text>
        <View style={[styles.roundStack, { alignItems: "center" }]}>
          <View style={styles.trophy}>
            <Ionicons name="trophy" size={26} color={c.brandInk} />
          </View>
          <Text style={styles.champion} numberOfLines={2}>
            {champion ? champion.name : "Gözlənilir"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Playoff: bracket overview on top, then each stage as a vertical list of full
 * match cards (where admins schedule and open matches).
 */
export function PlayoffView({ championship, matches, renderMatch }: { championship: Championship; matches: Match[]; renderMatch: MatchRenderer }) {
  const styles = useStyles();
  const columns = playoffColumns(matches, championship.status, championship.currentStage);
  if (columns.length === 0) {
    return (
      <EmptyState
        icon="git-network-outline"
        title="Pley-off hələ başlamayıb"
        description={championship.format === "GROUP_AND_PLAYOFF" ? "Qrup mərhələsi bitdikdən sonra pley-off cütləri burada görünəcək." : undefined}
      />
    );
  }
  return (
    <View>
      <Text style={[styles.stageTitle, { marginBottom: spacing.sm }]}>Turnir yolu</Text>
      <Bracket columns={columns} finished={championship.status === "FINISHED" || championship.status === "COMPLETED"} />
      {columns.map((col) => (
        <View key={col.stage} style={{ marginTop: spacing.xl }}>
          <Row style={{ marginBottom: spacing.sm }}>
            <Text style={styles.stageTitle}>{col.label}</Text>
            {col.current ? <Pill label="Cari mərhələ" tone="lime" /> : null}
          </Row>
          <View style={styles.stack}>{col.matches.map((m) => <View key={m.id}>{renderMatch(m)}</View>)}</View>
        </View>
      ))}
    </View>
  );
}

export function StatsView({ players }: { players: ChampionshipPlayerStat[] }) {
  const [metric, setMetric] = useState<"goals" | "assists" | "ga">("goals");
  const rows = useMemo(() => {
    const value = (p: ChampionshipPlayerStat) => (metric === "goals" ? p.goals : metric === "assists" ? p.assists : p.goals + p.assists);
    return players
      .filter((p) => value(p) > 0)
      .sort((a, b) => value(b) - value(a) || b.goals - a.goals)
      .map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        photo: p.photo,
        teamName: p.team?.name ?? "",
        matchesPlayed: p.matchesPlayed,
        goals: p.goals,
        assists: p.assists,
      }));
  }, [players, metric]);
  return (
    <View>
      <View style={{ marginHorizontal: -spacing.lg, marginTop: -spacing.sm }}>
        <ChipBar
          variant="chips"
          items={[
            { key: "goals", label: "Bombardirlər" },
            { key: "assists", label: "Asistlər" },
            { key: "ga", label: "Qol + Asist" },
          ]}
          active={metric}
          onChange={setMetric}
        />
      </View>
      {rows.length === 0 ? <EmptyState icon="stats-chart-outline" title="Hələ statistika yoxdur" /> : <PlayerStatList rows={rows} metric={metric} />}
    </View>
  );
}

export function MatchItem({ match, nowMs, onPress }: { match: Match; nowMs: number; onPress?: () => void }) {
  return <MatchCard match={match} nowMs={nowMs} onPress={onPress} showStage={Boolean(match.stage && match.stage !== "GROUP_STAGE")} />;
}

const useStyles = makeStyles((c) => ({
  header: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  title: { ...display(28), color: c.ink },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 },
  progressText: { fontFamily: ff.medium, fontSize: 11.5, color: c.textMuted },
  stack: { gap: spacing.md },
  groupName: { ...display(17, "bold"), color: c.ink, marginBottom: 8 },
  teamName: { fontSize: font.sm, fontFamily: ff.semibold, color: c.ink },
  stageTitle: { ...display(19, "bold"), color: c.ink, flex: 1 },
  bracket: { gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 4 },
  round: { width: 176, gap: 8 },
  roundLabel: { fontFamily: ff.bold, fontSize: 10.5, letterSpacing: 1.1, textTransform: "uppercase", color: c.textFaint },
  roundStack: { flex: 1, justifyContent: "space-around", gap: 12 },
  box: { borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, overflow: "hidden" },
  boxLive: { borderColor: c.brandBorder },
  boxRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9, paddingVertical: 7 },
  boxBorder: { borderTopWidth: 1, borderTopColor: c.border },
  boxTeam: { flex: 1, fontFamily: ff.medium, fontSize: 12, color: c.text },
  boxWin: { fontFamily: ff.bold, color: c.ink },
  boxLose: { color: c.textFaint },
  boxScore: { fontFamily: ff.bold, fontSize: 12.5, color: c.ink, fontVariant: ["tabular-nums"] },
  trophy: { width: 58, height: 58, borderRadius: 18, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" },
  champion: { fontFamily: ff.semibold, fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 8 },
}));
