import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AdminPageShell } from "../../../components/admin/AdminLayout";
import {
  ChampApiError,
  finishChampionship,
  startPlayoff,
  updateChampionshipMatch,
} from "../../../api/championships";
import { championshipPhase } from "../../../lib/competitionStatus";
import type { PlayoffTieGroup } from "../../../types/championship";
import type { Match } from "../../../types/match";
import { MANAGEMENT_TABS, type ManagementTabId } from "./constants";
import {
  canEditSchedule,
  isFixtureReady,
  isKickoffTooSoon,
  isSetupStatus,
  toDatetimeLocal,
} from "./helpers";
import { useChampionshipAdminData } from "./hooks/useChampionshipAdminData";
import { useCurrentChampionshipRound } from "./hooks/useCurrentChampionshipRound";
import { useGroupRounds } from "./hooks/useGroupRounds";
import {
  AllChampionshipMatches,
  ChampionshipGroups,
  ChampionshipHeader,
  ChampionshipOverview,
  ChampionshipStatistics,
  PlayoffStage,
  ScheduleMatchModal,
  TieBreakModal,
} from "./components";

function championshipSubtitle(championship: {
  format: string;
  matchFormat?: string;
  teamCount: number;
  matchCount: number;
  description: string | null;
}): string {
  if (championship.description) return championship.description;
  const format = championship.format === "PLAYOFF_ONLY" ? "Yalnız Playoff" : "Qrup + Playoff";
  const legs = championship.matchFormat === "HOME_AWAY" ? "Ev-səfər" : "1 oyun";
  return `${format} · ${legs} · ${championship.teamCount} komanda · ${championship.matchCount} oyun`;
}

export function AdminChampionshipDetailPage() {
  const { championshipId: idParam } = useParams();
  const championshipId = Number(idParam);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useChampionshipAdminData(championshipId);
  const { championship, matches, statistics, loading, error, load, setMatches } = data;

  const roundState = useCurrentChampionshipRound(
    matches,
    championship?.status,
    championship?.currentStage,
  );
  const groupViews = useGroupRounds(matches, championship?.groups ?? []);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scheduleMatch, setScheduleMatch] = useState<Match | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleVenue, setScheduleVenue] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [tieGroups, setTieGroups] = useState<PlayoffTieGroup[] | null>(null);
  const [tieOrders, setTieOrders] = useState<Record<string, number[]>>({});

  const readOnly = championship ? championshipPhase(championship.status) === "FINISHED" : false;
  const tabs = MANAGEMENT_TABS.filter(
    (tab) => tab.id !== "groups" || (championship?.groups.length ?? 0) > 0,
  );
  const tabParam = searchParams.get("tab");
  const activeTab: ManagementTabId = tabs.some((tab) => tab.id === tabParam)
    ? (tabParam as ManagementTabId)
    : "overview";

  const setTab = (id: ManagementTabId) => {
    setSearchParams(id === "overview" ? {} : { tab: id }, { replace: true });
  };

  const openSchedule = (match: Match) => {
    if (readOnly || !canEditSchedule(match)) return;
    setScheduleMatch(match);
    setScheduleAt(toDatetimeLocal(match.scheduledAt));
    setScheduleVenue(match.venue ?? "");
    setModalError(null);
  };

  const enterMatch = (match: Match) => {
    if (!readOnly && canEditSchedule(match) && !isFixtureReady(match)) return;
    navigate(`/admin/football/matches/${match.id}`);
  };

  const handleSaveSchedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!scheduleMatch || readOnly || !canEditSchedule(scheduleMatch)) return;
    if (!scheduleAt) {
      setModalError("Oyun vaxtı mütləqdir");
      return;
    }
    if (!scheduleVenue.trim()) {
      setModalError("Məkan mütləqdir");
      return;
    }
    if (isKickoffTooSoon(scheduleAt)) {
      setModalError("Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const updated = await updateChampionshipMatch(scheduleMatch.id, {
        scheduledAt: new Date(scheduleAt).toISOString(),
        venue: scheduleVenue.trim(),
      });
      setMatches((prev) => prev.map((match) => (match.id === updated.id ? updated : match)));
      setScheduleMatch(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Yenilənmədi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleFinishChampionship = () => {
    if (
      !window.confirm(
        "Are you sure you want to finish this championship? This action cannot be undone.",
      )
    ) {
      return;
    }
    setBusy(true);
    setActionError(null);
    void finishChampionship(championshipId)
      .then(() => load({ silent: true }))
      .catch((err: unknown) => {
        setActionError(err instanceof Error ? err.message : "Əməliyyat uğursuz oldu");
      })
      .finally(() => setBusy(false));
  };

  const handleStartPlayoff = (tieBreakTeamIds?: number[]) => {
    if (!tieBreakTeamIds && !window.confirm("Qrup mərhələsini bitirib playoff başlatmaq istəyirsiniz?")) {
      return;
    }
    setBusy(true);
    setActionError(null);
    void startPlayoff(championshipId, { playoffOnly: false, tieBreakTeamIds })
      .then(async () => {
        setTieGroups(null);
        await load({ silent: true });
        setTab("playoff");
      })
      .catch((err: unknown) => {
        if (err instanceof ChampApiError && err.code === "PLAYOFF_TIE" && err.ties?.length) {
          setTieGroups(err.ties);
          setTieOrders(
            Object.fromEntries(err.ties.map((group) => [group.id, group.teams.map((team) => team.teamId)])),
          );
          setActionError(err.message);
          return;
        }
        setActionError(err instanceof Error ? err.message : "Əməliyyat uğursuz oldu");
      })
      .finally(() => setBusy(false));
  };

  const submitTieBreak = () => {
    if (!tieGroups) return;
    const ids = tieGroups.flatMap(
      (group) => tieOrders[group.id] ?? group.teams.map((team) => team.teamId),
    );
    handleStartPlayoff(ids);
  };

  const moveTieTeam = (groupId: string, index: number, dir: -1 | 1) => {
    setTieOrders((prev) => {
      const list = [...(prev[groupId] ?? [])];
      const next = index + dir;
      if (next < 0 || next >= list.length) return prev;
      [list[index], list[next]] = [list[next], list[index]];
      return { ...prev, [groupId]: list };
    });
  };

  if (!Number.isInteger(championshipId) || championshipId <= 0) {
    return (
      <AdminPageShell title="Çempionat">
        <p className="text-sm text-rose-600">Yanlış çempionat ID.</p>
        <Link
          to="/admin/football/championships"
          className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Siyahıya qayıt
        </Link>
      </AdminPageShell>
    );
  }

  if (loading) {
    return (
      <AdminPageShell title="Çempionat">
        <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>
      </AdminPageShell>
    );
  }

  if (error || !championship) {
    return (
      <AdminPageShell title="Çempionat">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error ?? "Çempionat tapılmadı"}
        </div>
        <Link
          to="/admin/football/championships"
          className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Siyahıya qayıt
        </Link>
      </AdminPageShell>
    );
  }

  if (isSetupStatus(championship.status)) {
    return <Navigate to={`/admin/football/championships/${championship.id}/setup`} replace />;
  }

  return (
    <AdminPageShell
      title={championship.name}
      subtitle={championshipSubtitle(championship)}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {championship.status === "GROUP_STAGE" && roundState.groupStageComplete && !readOnly ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleStartPlayoff()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Pley-off başlat
            </button>
          ) : null}
          {championship.status === "PLAYOFF" && !readOnly ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleFinishChampionship}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Çempionatı bitir
            </button>
          ) : null}
          <Link
            to="/admin/football/championships"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Siyahı
          </Link>
        </div>
      }
    >
      <ChampionshipHeader
        championship={championship}
        tabs={tabs}
        activeTab={activeTab}
        onTab={setTab}
      />

      {actionError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {actionError}
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <ChampionshipOverview
          championship={championship}
          roundState={roundState}
          groupViews={groupViews}
          matches={matches}
          busy={busy}
          onSelect={openSchedule}
          onEnter={enterMatch}
          onStartPlayoff={() => handleStartPlayoff()}
          onOpenTab={setTab}
          onRefresh={() => load({ silent: true })}
        />
      ) : null}

      {activeTab === "groups" ? (
        <ChampionshipGroups
          groups={championship.groups}
          matches={matches}
          groupViews={groupViews}
          onSelect={openSchedule}
          onEnter={enterMatch}
          allowSchedule={!readOnly}
        />
      ) : null}

      {activeTab === "matches" ? (
        <AllChampionshipMatches
          groups={championship.groups}
          roundState={roundState}
          onSelect={openSchedule}
          onEnter={enterMatch}
          allowSchedule={!readOnly}
        />
      ) : null}

      {activeTab === "playoff" ? (
        <PlayoffStage
          championship={championship}
          matches={matches}
          currentStage={roundState.playoffStage}
          allowSchedule={!readOnly}
          onSelect={openSchedule}
          onEnter={enterMatch}
        />
      ) : null}

      {activeTab === "stats" ? <ChampionshipStatistics statistics={statistics} /> : null}

      <ScheduleMatchModal
        match={scheduleMatch}
        scheduleAt={scheduleAt}
        scheduleVenue={scheduleVenue}
        submitting={modalSubmitting}
        error={modalError}
        onClose={() => setScheduleMatch(null)}
        onChangeAt={setScheduleAt}
        onChangeVenue={setScheduleVenue}
        onSubmit={(event) => void handleSaveSchedule(event)}
      />

      <TieBreakModal
        tieGroups={tieGroups}
        tieOrders={tieOrders}
        busy={busy}
        onClose={() => setTieGroups(null)}
        onMove={moveTieTeam}
        onSubmit={submitTieBreak}
      />
    </AdminPageShell>
  );
}
