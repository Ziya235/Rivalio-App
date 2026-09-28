import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { championshipsApi } from "../../api/championships";
import { ChipBar } from "../../components/ChipBar";
import { ScrollScreen } from "../../components/Screen";
import { ErrorState, LoadingView } from "../../components/states";
import { useNow, usePolling } from "../../hooks/timers";
import { useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { spacing } from "../../theme";
import type { Match } from "../../types/match";
import {
  AllMatchesView,
  ChampionshipHeaderCard,
  championshipTabs,
  GroupsView,
  MatchItem,
  OverviewView,
  PlayoffView,
  StatsView,
  type ChampTab,
} from "./ChampionshipViews";

export function ChampionshipDetailScreen({ route, navigation }: RootScreenProps<"ChampionshipDetail">) {
  const { championshipId: id } = route.params;
  const [tab, setTab] = useState<ChampTab>("overview");

  const champ = useQuery(`champ:${id}`, () => championshipsApi.get(id));
  const ready = Boolean(champ.data);
  const standings = useQuery(ready ? `champ:${id}:standings` : null, () => championshipsApi.standings(id));
  const matches = useQuery(ready ? `champ:${id}:matches` : null, () => championshipsApi.matches(id));
  const stats = useQuery(ready ? `champ:${id}:stats` : null, () => championshipsApi.statistics(id));

  useEffect(() => {
    if (champ.data) navigation.setOptions({ title: champ.data.name });
  }, [navigation, champ.data]);

  const hasLive = (matches.data ?? []).some((m) => m.status === "LIVE");
  const nowMs = useNow(hasLive);
  const reloadAll = useCallback(() => {
    void champ.reload();
    void standings.reload();
    void matches.reload();
    void stats.reload();
  }, [champ, standings, matches, stats]);
  usePolling(reloadAll, hasLive);

  const myTeamIds = useMemo(() => new Set((champ.data?.myTeams ?? []).map((t) => t.id)), [champ.data]);
  const tabs = useMemo(() => (champ.data ? championshipTabs(champ.data) : []), [champ.data]);

  if (champ.loading) return <LoadingView />;
  if (champ.error || !champ.data) return <ErrorState error={champ.error} onRetry={champ.refresh} />;

  const championship = champ.data;
  const matchList = matches.data ?? [];
  const renderMatch = (m: Match) => (
    <MatchItem match={m} nowMs={nowMs} onPress={() => navigation.navigate("MatchDetail", { matchId: m.id, kind: "championship" })} />
  );
  const activeTab = tabs.some((t) => t.key === tab) ? tab : "overview";
  const dataError = matches.error ?? standings.error;

  return (
    <ScrollScreen
      refreshing={champ.refreshing}
      onRefresh={() => void Promise.all([champ.refresh(), standings.refresh(), matches.refresh(), stats.refresh()])}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ChampionshipHeaderCard championship={championship} />
      </View>
      <ChipBar items={tabs} active={activeTab} onChange={setTab} />
      <View style={{ paddingHorizontal: spacing.lg }}>
        {dataError ? (
          <ErrorState error={dataError} onRetry={() => void Promise.all([matches.refresh(), standings.refresh()])} />
        ) : !matches.data || !standings.data ? (
          <LoadingView />
        ) : activeTab === "overview" ? (
          <OverviewView championship={championship} matches={matchList} standings={standings.data} renderMatch={renderMatch} myTeamIds={myTeamIds} />
        ) : activeTab === "groups" ? (
          <GroupsView championship={championship} matches={matchList} standings={standings.data} renderMatch={renderMatch} myTeamIds={myTeamIds} />
        ) : activeTab === "matches" ? (
          <AllMatchesView matches={matchList} renderMatch={renderMatch} />
        ) : activeTab === "playoff" ? (
          <PlayoffView championship={championship} matches={matchList} renderMatch={renderMatch} />
        ) : stats.data ? (
          <StatsView players={stats.data.players} />
        ) : (
          <LoadingView />
        )}
      </View>
    </ScrollScreen>
  );
}
