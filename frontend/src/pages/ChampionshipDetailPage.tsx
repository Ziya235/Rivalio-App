import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  fetchVisibleChampionship,
  fetchVisibleChampionshipMatches,
  fetchVisibleChampionshipStandings,
  fetchVisibleChampionshipStatistics,
} from "../api/championships";
import { ChampionshipGroups } from "../components/championship/ChampionshipGroups";
import { ChampionshipHeader } from "../components/championship/ChampionshipHeader";
import { ChampionshipMatches } from "../components/championship/ChampionshipMatches";
import { ChampionshipOverview } from "../components/championship/ChampionshipOverview";
import { ChampionshipPlayoff } from "../components/championship/ChampionshipPlayoff";
import {
  ChampionshipTabs,
  type ChampionshipTabId,
} from "../components/championship/ChampionshipTabs";
import { ChampError, ChampSkeleton } from "../components/championship/ChampShared";
import { TopScorers } from "../components/championship/TopScorers";
import { Button } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import type {
  ChampionshipListItem,
  GroupStandingsBlock,
  PlayerStatistics,
} from "../types/championship";
import type { Match } from "../types/match";

const TAB_IDS: ChampionshipTabId[] = [
  "overview",
  "groups",
  "playoff",
  "scorers",
  "matches",
];

export default function ChampionshipDetailPage() {
  const { championshipId: idParam } = useParams();
  const championshipId = Number(idParam);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [championship, setChampionship] = useState<ChampionshipListItem | null>(
    null,
  );
  const [standings, setStandings] = useState<GroupStandingsBlock[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [statistics, setStatistics] = useState<PlayerStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<
    "upcoming" | "live" | "finished"
  >("upcoming");

  const tabParam = searchParams.get("tab");
  const activeTab: ChampionshipTabId = TAB_IDS.includes(
    tabParam as ChampionshipTabId,
  )
    ? (tabParam as ChampionshipTabId)
    : "overview";

  const load = useCallback(async (silent = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!Number.isInteger(championshipId) || championshipId <= 0) {
      setError("Yanlış çempionat");
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [champ, standingRows, matchRows, stats] = await Promise.all([
        fetchVisibleChampionship(championshipId),
        fetchVisibleChampionshipStandings(championshipId),
        fetchVisibleChampionshipMatches(championshipId),
        fetchVisibleChampionshipStatistics(championshipId),
      ]);
      setChampionship(champ);
      setStandings(standingRows);
      setMatches(matchRows);
      setStatistics(stats);
      if (!silent) setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Çempionat məlumatlarını yükləmək mümkün olmadı.",
      );
      if (!silent) {
        setChampionship(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [championshipId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasLive = matches.some((m) => m.status === "LIVE");
  useEffect(() => {
    if (!hasLive) return;
    const timer = window.setInterval(() => {
      void load(true);
    }, 12_000);
    return () => window.clearInterval(timer);
  }, [hasLive, load]);

  const hasGroups =
    championship?.format === "GROUP_AND_PLAYOFF" ||
    (championship?.groups.length ?? 0) > 0;
  const hasPlayoff =
    championship?.format === "PLAYOFF_ONLY" ||
    championship?.format === "GROUP_AND_PLAYOFF";

  const tabs = useMemo(() => {
    const all: { id: ChampionshipTabId; label: string }[] = [
      { id: "overview", label: "Ümumi baxış" },
    ];
    if (hasGroups) all.push({ id: "groups", label: "Qruplar" });
    if (hasPlayoff) all.push({ id: "playoff", label: "Playoff" });
    all.push({ id: "scorers", label: "Bombardirlər" });
    all.push({ id: "matches", label: "Oyunlar" });
    return all;
  }, [hasGroups, hasPlayoff]);

  useEffect(() => {
    if (!championship) return;
    if (!tabs.some((t) => t.id === activeTab)) {
      setSearchParams({ tab: "overview" }, { replace: true });
    }
  }, [activeTab, championship, setSearchParams, tabs]);

  const myTeamIds = useMemo(
    () => new Set((championship?.myTeams ?? []).map((t) => t.id)),
    [championship?.myTeams],
  );

  const openMatch = (match: Match) => {
    navigate(
      `/sports/football/championships/${championshipId}/matches/${match.id}`,
    );
  };

  const bg =
    "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]";

  if (!user) {
    return (
      <div className={`min-h-screen pt-24 text-center ${bg}`}>
        <p className="mb-4 text-gray-500">Çempionata baxmaq üçün daxil olun</p>
        <Button onClick={() => navigate("/login")}>Giriş</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen pt-24 ${bg}`}>
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <ChampSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (error || !championship) {
    return (
      <div className={`min-h-screen pt-24 ${bg}`}>
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <ChampError
            message={error || "Çempionat məlumatlarını yükləmək mümkün olmadı."}
            onRetry={() => void load()}
          />
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700"
              onClick={() => navigate("/sports/football?tab=championships")}
            >
              Çempionatlara qayıt
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-24 pb-20 ${bg}`}>
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
        <ChampionshipHeader championship={championship} />
        <div className="mt-6">
          <ChampionshipTabs
            tabs={tabs}
            active={activeTab}
            onChange={(id) => setSearchParams({ tab: id }, { replace: true })}
          />
        </div>
        <div className="mt-6">
          {activeTab === "overview" ? (
            <ChampionshipOverview
              championship={championship}
              matches={matches}
              standings={standings}
              statistics={statistics}
            />
          ) : null}
          {activeTab === "groups" ? (
            <ChampionshipGroups standings={standings} myTeamIds={myTeamIds} />
          ) : null}
          {activeTab === "playoff" ? (
            <ChampionshipPlayoff matches={matches} onOpenMatch={openMatch} />
          ) : null}
          {activeTab === "scorers" ? <TopScorers rows={statistics} /> : null}
          {activeTab === "matches" ? (
            <ChampionshipMatches
              matches={matches}
              filter={matchFilter}
              onFilterChange={setMatchFilter}
              onOpenMatch={openMatch}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
