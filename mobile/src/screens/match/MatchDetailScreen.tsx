import { useEffect, useMemo, useRef } from "react";
import { matchesApi } from "../../api/matches";
import { ScrollScreen } from "../../components/Screen";
import { ErrorState, LoadingView } from "../../components/states";
import { SectionTitle } from "../../components/ui";
import { useNow, usePolling } from "../../hooks/timers";
import { useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { computeMatchClock, serverOffset } from "../../utils/matchClock";
import { EventsTimeline, MatchScoreboard } from "./MatchParts";

/**
 * Read-only match view. Updates while LIVE come from polling (12s, like the web):
 * the backend emits no socket events for matches. The clock ticks locally and is
 * aligned to the server clock using `serverNow`.
 */
export function MatchDetailScreen({ route, navigation }: RootScreenProps<"MatchDetail">) {
  const { matchId, kind } = route.params;
  const fetchedAt = useRef(Date.now());
  const query = useQuery(`match:${kind}:${matchId}`, async () => {
    const data = kind === "league" ? await matchesApi.get(matchId) : await matchesApi.getChampionshipMatch(matchId);
    fetchedAt.current = Date.now();
    return data;
  });
  const match = query.data;
  const live = match?.status === "LIVE";
  const nowMs = useNow(live);
  usePolling(() => void query.reload(), live);

  useEffect(() => {
    if (match) navigation.setOptions({ title: `${match.homeTeam.name} – ${match.awayTeam.name}` });
  }, [navigation, match]);

  const clock = useMemo(
    () => (match ? computeMatchClock(match, nowMs + serverOffset(match, fetchedAt.current)) : null),
    [match, nowMs],
  );

  if (query.loading) return <LoadingView />;
  if (query.error || !match) return <ErrorState error={query.error} onRetry={query.refresh} />;

  return (
    <ScrollScreen refreshing={query.refreshing} onRefresh={query.refresh}>
      <MatchScoreboard match={match} clock={clock} />
      <SectionTitle count={match.events?.length ?? 0}>Hadisələr</SectionTitle>
      <EventsTimeline match={match} />
    </ScrollScreen>
  );
}
