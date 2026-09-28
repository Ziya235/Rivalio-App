import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { leaguesApi } from "../../api/leagues";
import { ChipBar } from "../../components/ChipBar";
import { MatchCard } from "../../components/MatchCard";
import { RoundPager } from "../../components/RoundPager";
import { ScrollScreen } from "../../components/Screen";
import { EmptyState, ErrorState, LoadingView } from "../../components/states";
import { PlayerStatList, StandingsTable, type PlayerStatItem, type StandingItem } from "../../components/tables";
import { Card, IconTile, Muted, Pill, Row, TeamCrest } from "../../components/ui";
import { useNow, usePolling } from "../../hooks/timers";
import { useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { display, spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import type { League, LeaguePlayerRow, LeagueStandingRow } from "../../types/league";
import type { Match } from "../../types/match";
import { buildRounds } from "../../utils/rounds";
import { leaguePhase, PHASE_LABEL, PHASE_TONE, visibilityLabel } from "../../utils/status";

export type LeagueTab = "standings" | "matches" | "goals" | "assists" | "ga";

export const LEAGUE_TABS: { key: LeagueTab; label: string }[] = [
  { key: "standings", label: "Cədvəl" },
  { key: "matches", label: "Oyunlar" },
  { key: "goals", label: "Bombardirlər" },
  { key: "assists", label: "Asistlər" },
  { key: "ga", label: "Qol + Asist" },
];

export function toStandingItems(rows: LeagueStandingRow[]): StandingItem[] {
  return rows.map((r) => ({
    teamId: r.teamId,
    name: r.teamName,
    logo: r.logo,
    played: r.played,
    won: r.wins,
    drawn: r.draws,
    lost: r.losses,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDiff: r.goalDifference,
    points: r.points,
  }));
}

const name = (p: LeaguePlayerRow) => `${p.firstName} ${p.lastName}`.trim();

/** Same sort rules as the web league page. */
export function playerTable(players: LeaguePlayerRow[], metric: "goals" | "assists" | "ga"): PlayerStatItem[] {
  const value = (p: LeaguePlayerRow) => (metric === "goals" ? p.goals : metric === "assists" ? p.assists : p.goals + p.assists);
  const tie = (a: LeaguePlayerRow, b: LeaguePlayerRow) => (metric === "assists" ? b.goals - a.goals : metric === "goals" ? b.assists - a.assists : b.goals - a.goals);
  return players
    .filter((p) => value(p) > 0)
    .sort((a, b) => value(b) - value(a) || tie(a, b) || name(a).localeCompare(name(b), "az"))
    .map((p) => ({
      id: p.id,
      name: name(p),
      photo: p.photo,
      teamName: p.team.name,
      matchesPlayed: p.matchesPlayed,
      goals: p.goals,
      assists: p.assists,
    }));
}

export const EMPTY_STAT_TEXT = {
  goals: "Hələ qol yoxdur.",
  assists: "Hələ asist yoxdur.",
  ga: "Hələ qol və ya asist yoxdur.",
} as const;

export function LeagueHeader({ league }: { league: League }) {
  const styles = useStyles();
  const phase = leaguePhase(league.status);
  return (
    <Card style={styles.header}>
      <Row gap={spacing.md} style={{ alignItems: "flex-start" }}>
        {league.logo ? <TeamCrest name={league.name} logo={league.logo} size={52} /> : <IconTile icon="trophy-outline" tone="orange" size={52} />}
        <View style={{ flex: 1, gap: 8 }}>
          <Row gap={6} style={{ flexWrap: "wrap" }}>
            <Pill label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} />
            <Pill
              label={visibilityLabel(league.visibility)}
              tone={league.visibility === "PRIVATE" ? "violet" : "blue"}
              icon={league.visibility === "PRIVATE" ? "lock-closed" : "globe-outline"}
            />
            {league.season ? <Pill label={league.season} /> : null}
          </Row>
          <Text style={styles.title} accessibilityRole="header">
            {league.name}
          </Text>
        </View>
      </Row>
      {league.description ? <Muted style={{ marginTop: spacing.sm }}>{league.description}</Muted> : null}
    </Card>
  );
}

export function LeagueDetailScreen({ route, navigation }: RootScreenProps<"LeagueDetail">) {
  const { leagueId } = route.params;
  const [tab, setTab] = useState<LeagueTab>("standings");
  const styles = useStyles();

  const league = useQuery(`league:${leagueId}`, () => leaguesApi.get(leagueId));
  const canLoad = Boolean(league.data);
  const standings = useQuery(canLoad ? `league:${leagueId}:standings` : null, () => leaguesApi.standings(leagueId));
  const matches = useQuery(canLoad ? `league:${leagueId}:matches` : null, () => leaguesApi.matches(leagueId));
  const players = useQuery(canLoad ? `league:${leagueId}:players` : null, () => leaguesApi.players(leagueId));

  useEffect(() => {
    if (league.data) navigation.setOptions({ title: league.data.name });
  }, [navigation, league.data]);

  const hasLive = (matches.data ?? []).some((m) => m.status === "LIVE");
  const nowMs = useNow(hasLive && tab === "matches");
  const reloadAll = useCallback(() => {
    void standings.reload();
    void matches.reload();
    void players.reload();
  }, [standings, matches, players]);
  usePolling(reloadAll, hasLive);

  const rounds = useMemo(() => buildRounds(matches.data ?? []), [matches.data]);

  const refresh = async () => {
    await Promise.all([league.refresh(), standings.refresh(), matches.refresh(), players.refresh()]);
  };

  if (league.loading) return <LoadingView />;
  if (league.error || !league.data) return <ErrorState error={league.error} onRetry={league.refresh} />;

  const openMatch = (m: Match) => navigation.navigate("MatchDetail", { matchId: m.id, kind: "league" });

  return (
    <ScrollScreen refreshing={league.refreshing || standings.refreshing} onRefresh={() => void refresh()} contentStyle={{ paddingHorizontal: 0 }}>
      <View style={styles.pad}>
        <LeagueHeader league={league.data} />
      </View>
      <ChipBar items={LEAGUE_TABS} active={tab} onChange={setTab} />
      <View style={styles.pad}>
        {tab === "standings" ? (
          standings.error ? (
            <ErrorState error={standings.error} onRetry={standings.refresh} />
          ) : !standings.data ? (
            <LoadingView />
          ) : standings.data.standings.length === 0 ? (
            <EmptyState icon="trophy-outline" title="Hələ komanda yoxdur" />
          ) : (
            <StandingsTable
              rows={toStandingItems(standings.data.standings)}
              onPressTeam={(teamId) => navigation.navigate("TeamDetail", { teamId })}
            />
          )
        ) : null}

        {tab === "matches" ? (
          matches.error ? (
            <ErrorState error={matches.error} onRetry={matches.refresh} />
          ) : !matches.data ? (
            <LoadingView />
          ) : rounds.length === 0 ? (
            <EmptyState icon="football-outline" title="Hələ oyun yoxdur" description="Liqa başladıqdan sonra oyunlar burada görünəcək." />
          ) : (
            <RoundPager rounds={rounds} renderMatch={(m) => <MatchCard match={m} nowMs={nowMs} onPress={() => openMatch(m)} />} />
          )
        ) : null}

        {tab === "goals" || tab === "assists" || tab === "ga" ? (
          players.error ? (
            <ErrorState error={players.error} onRetry={players.refresh} />
          ) : !players.data ? (
            <LoadingView />
          ) : (
            (() => {
              const rows = playerTable(players.data, tab);
              return rows.length === 0 ? (
                <EmptyState icon="stats-chart-outline" title={EMPTY_STAT_TEXT[tab]} />
              ) : (
                <PlayerStatList rows={rows} metric={tab} onPressPlayer={(playerId) => navigation.navigate("PlayerProfile", { playerId })} />
              );
            })()
          )
        ) : null}
      </View>
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  pad: { paddingHorizontal: spacing.lg },
  header: { marginBottom: spacing.md },
  title: { ...display(26), color: c.ink },
}));
