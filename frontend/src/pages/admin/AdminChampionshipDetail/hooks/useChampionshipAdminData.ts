import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchChampionship,
  fetchChampionshipJoinRequests,
  fetchChampionshipMatches,
  fetchChampionshipStatistics,
} from "../../../../api/championships";
import { useSocket } from "../../../../context/SocketContext";
import type {
  Championship,
  ChampionshipJoinRequest,
  ChampionshipStatistics,
} from "../../../../types/championship";
import type { Match } from "../../../../types/match";

const EMPTY_STATS: ChampionshipStatistics = { players: [], teams: [] };

export function useChampionshipAdminData(championshipId: number) {
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [statistics, setStatistics] = useState<ChampionshipStatistics>(EMPTY_STATS);
  const [joinRequests, setJoinRequests] = useState<ChampionshipJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { notifications } = useSocket();
  const champNoticeSignature = notifications
    .filter(
      (item) =>
        item.type === "CHAMPIONSHIP_JOIN_REQUEST" || item.type === "CHAMPIONSHIP_INVITE",
    )
    .map(
      (item) =>
        `${item.id}:${item.championshipJoinRequestStatus ?? ""}:${item.championshipInviteStatus ?? ""}`,
    )
    .join("|");
  const skipNoticeReload = useRef(true);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!Number.isInteger(championshipId) || championshipId <= 0) {
        setError("Yanlış çempionat");
        setLoading(false);
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const [champ, matchList, stats, joins] = await Promise.all([
          fetchChampionship(championshipId),
          fetchChampionshipMatches(championshipId),
          fetchChampionshipStatistics(championshipId),
          fetchChampionshipJoinRequests(championshipId).catch(() => []),
        ]);
        setChampionship(champ);
        setMatches(matchList);
        setStatistics(stats);
        setJoinRequests(joins);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Yüklənmədi");
        if (!opts?.silent) {
          setChampionship(null);
          setMatches([]);
          setStatistics(EMPTY_STATS);
          setJoinRequests([]);
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [championshipId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (skipNoticeReload.current) {
      skipNoticeReload.current = false;
      return;
    }
    void load({ silent: true });
  }, [champNoticeSignature, load]);

  return {
    championship,
    setChampionship,
    matches,
    setMatches,
    statistics,
    joinRequests,
    loading,
    error,
    load,
  };
}
