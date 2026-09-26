import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeftRight,
  ChevronRight,
  CircleDot,
  NotebookPen,
  Pencil,
  Play,
  Square,
  TriangleAlert,
} from "lucide-react";
import { AdminPageShell } from "../../../components/admin/AdminLayout";
import { AdminModal, ModalCancelButton } from "../../../components/admin/AdminModal";
import {
  addMatchEvent,
  deleteMatchEvent,
  fetchMatch,
  updateMatch,
  updateMatchEvent,
} from "../../../api/admin";
import { fetchTeam } from "../../../api/leagues";
import { fetchTeam as fetchTeamDetail } from "../../../api/teams";
import { MATCH_CLOCK_MAX_MINUTES, computeMatchClock } from "../../../lib/matchClock";
import type { TeamPlayer } from "../../../types/league";
import type { Match, MatchEvent, MatchEventType, MatchStatus } from "../../../types/match";
import { EVENT_MINUTE_MAX, EVENT_MINUTE_MIN, type EventModalKind, eventKindFromType } from "./constants";
import { deleteEventPrompt, roundedEventMinute } from "./helpers";
import { EventFormModal, MatchEventList, MatchScoreboard } from "./components";

export function AdminMatchDetailPage() {
  const { matchId: matchIdParam } = useParams();
  const matchId = Number(matchIdParam);

  const [match, setMatch] = useState<Match | null>(null);
  const [homePlayers, setHomePlayers] = useState<TeamPlayer[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [eventKind, setEventKind] = useState<EventModalKind>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [minute, setMinute] = useState("1");
  const [teamId, setTeamId] = useState<number | "">("");
  const [playerId, setPlayerId] = useState<number | "">("");
  const [assistPlayerId, setAssistPlayerId] = useState<number | "">("");
  const [playerInId, setPlayerInId] = useState<number | "">("");
  const [playerOutId, setPlayerOutId] = useState<number | "">("");
  const [cardType, setCardType] = useState<"YELLOW_CARD" | "RED_CARD">("YELLOW_CARD");
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [note, setNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MatchEvent | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);
  const [confirmKind, setConfirmKind] = useState<"start" | "finish" | "edit" | null>(null);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!Number.isInteger(matchId) || matchId <= 0) {
        setError("Yanlış oyun");
        setLoading(false);
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await fetchMatch(matchId);
        setMatch(data);
        setFetchedAt(Date.now());
        if (data.leagueId) {
          const [home, away] = await Promise.all([
            fetchTeam(data.leagueId, data.homeTeamId),
            fetchTeam(data.leagueId, data.awayTeamId),
          ]);
          setHomePlayers(home.players);
          setAwayPlayers(away.players);
        } else {
          const [home, away] = await Promise.all([
            fetchTeamDetail(data.homeTeamId),
            fetchTeamDetail(data.awayTeamId),
          ]);
          const toPlayers = (
            players: Awaited<ReturnType<typeof fetchTeamDetail>>["players"],
          ): TeamPlayer[] =>
            players.map((player) => ({
              id: player.id,
              firstName: player.firstName,
              lastName: player.lastName,
              position: player.position,
              shirtNumber: player.shirtNumber,
              photo: player.photo,
              goals: 0,
              assists: 0,
              matchesPlayed: 0,
              minutes: 0,
            }));
          setHomePlayers(toPlayers(home.players));
          setAwayPlayers(toPlayers(away.players));
        }
      } catch (err) {
        if (!opts?.silent) {
          setError(err instanceof Error ? err.message : "Oyun yüklənmədi");
          setMatch(null);
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [matchId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const clockOffset = useMemo(() => {
    if (!match?.serverNow) return 0;
    return new Date(match.serverNow).getTime() - fetchedAt;
  }, [match?.serverNow, fetchedAt]);

  const alignedNow = nowMs + clockOffset;
  const clock = match ? computeMatchClock(match, alignedNow) : null;

  useEffect(() => {
    if (!match || match.status !== "LIVE") return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [match?.id, match?.status]);

  useEffect(() => {
    if (!match || match.status !== "LIVE" || !clock) return;
    if (clock.elapsedSeconds < MATCH_CLOCK_MAX_MINUTES * 60) return;
    const id = window.setTimeout(() => {
      void load({ silent: true });
    }, 2000);
    return () => window.clearTimeout(id);
  }, [clock?.elapsedSeconds, match, load]);

  const applyMatch = (data: Match) => {
    setMatch(data);
    setFetchedAt(Date.now());
    setNowMs(Date.now());
  };

  const playersForTeam = useMemo(() => {
    if (!match || !teamId) return [];
    if (teamId === match.homeTeamId) return homePlayers;
    if (teamId === match.awayTeamId) return awayPlayers;
    return [];
  }, [match, teamId, homePlayers, awayPlayers]);

  const resetEventForm = () => {
    const currentMinute = clock
      ? roundedEventMinute(clock.minute, clock.second)
      : EVENT_MINUTE_MIN;
    setMinute(String(currentMinute));
    setTeamId(match?.homeTeamId ?? "");
    setPlayerId("");
    setAssistPlayerId("");
    setPlayerInId("");
    setPlayerOutId("");
    setCardType("YELLOW_CARD");
    setIsOwnGoal(false);
    setNote("");
    setFormError(null);
  };

  const openEventModal = (kind: EventModalKind, event?: MatchEvent) => {
    const writable =
      match?.status === "LIVE" || (match?.status === "FINISHED" && editMode);
    if (!match || !writable || match.stageLocked || match.isLocked) {
      toast.info(
        match?.status === "FINISHED"
          ? "Bitmiş oyunu redaktə etmək olmur"
          : "Əvvəlcə oyunu başladın və ya redaktə rejiminə keçin",
        { toastId: "match-not-started" },
      );
      return;
    }
    resetEventForm();
    if (event) {
      setEditingEvent(event);
      setMinute(String(roundedEventMinute(event.minute, 0)));
      setTeamId(event.teamId ?? "");
      setPlayerId(event.playerId ?? "");
      setAssistPlayerId(event.assistPlayerId ?? "");
      setPlayerInId(event.playerInId ?? "");
      setPlayerOutId(event.playerOutId ?? "");
      setCardType(event.type === "RED_CARD" ? "RED_CARD" : "YELLOW_CARD");
      setIsOwnGoal(event.type === "OWN_GOAL");
      setNote(event.note ?? "");
    } else {
      setEditingEvent(null);
      if (kind === "NOTE") setTeamId("");
    }
    setEventKind(kind);
  };

  const patchStatus = async (status: MatchStatus) => {
    if (!match) return;
    if (
      status === "LIVE" &&
      match.status === "SCHEDULED" &&
      !(match.scheduledAt && match.venue?.trim())
    ) {
      return;
    }
    setBusy(true);
    try {
      applyMatch(await updateMatch(match.id, { status }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yenilənmədi");
    } finally {
      setBusy(false);
    }
  };

  const handleAddEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!match || !eventKind) return;

    const minuteValue = Number(minute);
    if (
      !Number.isInteger(minuteValue) ||
      minuteValue < EVENT_MINUTE_MIN ||
      minuteValue > EVENT_MINUTE_MAX
    ) {
      setFormError(`Dəqiqə ${EVENT_MINUTE_MIN}–${EVENT_MINUTE_MAX} arası olmalıdır`);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      let payload;
      if (eventKind === "GOAL") {
        if (!teamId || !playerId) {
          setFormError(!teamId ? "Komanda seçin" : "Oyunçu seçin");
          setSubmitting(false);
          return;
        }
        payload = {
          type: (isOwnGoal ? "OWN_GOAL" : "GOAL") as MatchEventType,
          minute: minuteValue,
          teamId: Number(teamId),
          playerId: Number(playerId),
          assistPlayerId: !isOwnGoal && assistPlayerId ? Number(assistPlayerId) : undefined,
        };
      } else if (eventKind === "CARD") {
        if (!teamId || !playerId) {
          setFormError(!teamId ? "Komanda seçin" : "Oyunçu seçin");
          setSubmitting(false);
          return;
        }
        payload = {
          type: cardType,
          minute: minuteValue,
          teamId: Number(teamId),
          playerId: Number(playerId),
        };
      } else if (eventKind === "SUB") {
        if (!teamId || !playerInId || !playerOutId) {
          setFormError("Komanda və hər iki oyunçu lazımdır");
          setSubmitting(false);
          return;
        }
        payload = {
          type: "SUBSTITUTION" as const,
          minute: minuteValue,
          teamId: Number(teamId),
          playerInId: Number(playerInId),
          playerOutId: Number(playerOutId),
        };
      } else {
        if (!teamId) {
          setFormError("Komanda seçin");
          setSubmitting(false);
          return;
        }
        payload = {
          type: "NOTE" as const,
          minute: minuteValue,
          teamId: Number(teamId),
          note: note.trim() || undefined,
        };
      }

      const result = editingEvent
        ? await updateMatchEvent(match.id, editingEvent.id, payload)
        : await addMatchEvent(match.id, payload);
      applyMatch(result.match);
      setEventKind(null);
      setEditingEvent(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Hadisə əlavə olunmadı");
    } finally {
      setSubmitting(false);
    }
  };

  const closeDeleteModal = () => {
    if (busy) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleDeleteEvent = async () => {
    if (!match || !deleteTarget) return;
    setBusy(true);
    setDeleteError(null);
    try {
      applyMatch(await deleteMatchEvent(match.id, deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Silinmədi");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>;
  }

  if (error || !match) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-rose-600">{error || "Oyun tapılmadı"}</p>
        <Link to="/admin/football/leagues" className="text-sm font-semibold text-brand">
          ← Geri
        </Link>
      </div>
    );
  }

  const events = match.events ?? [];
  const canManageEvents =
    (match.status === "LIVE" || (match.status === "FINISHED" && editMode)) &&
    Boolean(match.eventsWritable ?? true) &&
    !match.stageLocked &&
    !match.isLocked;

  const eventModalTitle =
    eventKind === "GOAL"
      ? editingEvent
        ? "Qolu dəyiş"
        : "Qol əlavə et"
      : eventKind === "CARD"
        ? editingEvent
          ? "Kartı dəyiş"
          : "Kart əlavə et"
        : eventKind === "SUB"
          ? editingEvent
            ? "Dəyişikliyi yenilə"
            : "Dəyişiklik"
          : editingEvent
            ? "Qeydi dəyiş"
            : "Qeyd əlavə et";

  const canSubmitEvent =
    eventKind === "GOAL" || eventKind === "CARD"
      ? Boolean(teamId && playerId)
      : eventKind === "SUB"
        ? Boolean(teamId && playerInId && playerOutId)
        : Boolean(teamId);

  return (
    <AdminPageShell
      title={`${match.homeTeam.name} — ${match.awayTeam.name}`}
      subtitle={`${match.league?.name ?? match.championship?.name ?? "Çempionat"}${
        match.round ? ` · ${match.round}-ci tur` : ""
      }${match.venue ? ` · ${match.venue}` : ""}`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {match.status === "SCHEDULED" ? (
            <button
              type="button"
              disabled={busy || !(match.scheduledAt && match.venue?.trim())}
              onClick={() => setConfirmKind("start")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              title={
                match.scheduledAt && match.venue?.trim()
                  ? "Oyunu başlat"
                  : "Əvvəlcə vaxt və məkan təyin edin"
              }
            >
              <Play className="h-4 w-4" />
              Oyunu başlat
            </button>
          ) : null}
          {match.status === "LIVE" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmKind("finish")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5" />
              Oyunu bitir
            </button>
          ) : null}
          {match.status === "FINISHED" && match.canEdit && !editMode ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmKind("edit")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
              Redaktə et
            </button>
          ) : null}
          {editMode ? (
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Redaktəni bitir
            </button>
          ) : null}
        </div>
      }
    >
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-slate-500">
        <Link
          to={
            match.league?.id
              ? `/admin/football/leagues/${match.league.id}?tab=matches`
              : match.championshipId
                ? `/admin/football/championships/${match.championshipId}`
                : "/admin/football/leagues"
          }
          className="hover:text-brand"
        >
          {match.league?.name ?? match.championship?.name ?? "Geri"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">İdarəetmə</span>
      </nav>

      <MatchScoreboard match={match} clock={clock} />

      {canManageEvents ? (
        <div className="mb-6 grid gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => openEventModal("GOAL")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <CircleDot className="h-4 w-4" />
            Qol
          </button>
          <button
            type="button"
            onClick={() => openEventModal("CARD")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-500"
          >
            <TriangleAlert className="h-4 w-4" />
            Kart
          </button>
          <button
            type="button"
            onClick={() => openEventModal("SUB")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-3 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Dəyişiklik
          </button>
          <button
            type="button"
            onClick={() => openEventModal("NOTE")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <NotebookPen className="h-4 w-4" />
            Qeyd
          </button>
        </div>
      ) : null}

      <MatchEventList
        match={match}
        events={events}
        canManage={canManageEvents}
        busy={busy}
        onEdit={(item) => openEventModal(eventKindFromType(item.type), item)}
        onDelete={(item) => {
          setDeleteError(null);
          setDeleteTarget(item);
        }}
      />

      {eventKind ? (
        <EventFormModal
          open
          title={eventModalTitle}
          match={match}
          eventKind={eventKind}
          submitting={submitting}
          canSubmit={canSubmitEvent}
          formError={formError}
          minute={minute}
          teamId={teamId}
          playerId={playerId}
          assistPlayerId={assistPlayerId}
          playerInId={playerInId}
          playerOutId={playerOutId}
          cardType={cardType}
          isOwnGoal={isOwnGoal}
          note={note}
          editing={Boolean(editingEvent)}
          players={playersForTeam}
          onClose={() => setEventKind(null)}
          onSubmit={(formEvent) => void handleAddEvent(formEvent)}
          onMinute={setMinute}
          onTeam={(value) => {
            setTeamId(value);
            setPlayerId("");
            setAssistPlayerId("");
            setPlayerInId("");
            setPlayerOutId("");
          }}
          onPlayer={setPlayerId}
          onAssist={setAssistPlayerId}
          onPlayerIn={setPlayerInId}
          onPlayerOut={setPlayerOutId}
          onCardType={setCardType}
          onOwnGoal={(value) => {
            setIsOwnGoal(value);
            if (value) setAssistPlayerId("");
          }}
          onNote={setNote}
        />
      ) : null}

      <AdminModal
        open={deleteTarget != null}
        title="Hadisəni sil"
        onClose={closeDeleteModal}
        footer={
          <>
            <ModalCancelButton onClick={closeDeleteModal} disabled={busy} />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDeleteEvent()}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {busy ? "Gözləyin..." : "Sil"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          {deleteTarget ? deleteEventPrompt(deleteTarget.type) : null}
        </p>
        {deleteError ? <p className="mt-3 text-sm font-medium text-rose-600">{deleteError}</p> : null}
      </AdminModal>

      <AdminModal
        open={confirmKind != null}
        title={
          confirmKind === "start"
            ? "Oyunu başlat"
            : confirmKind === "finish"
              ? "Oyunu bitir"
              : "Oyunu redaktə et"
        }
        onClose={() => !busy && setConfirmKind(null)}
        footer={
          <>
            <ModalCancelButton onClick={() => setConfirmKind(null)} disabled={busy} />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirmKind === "start") {
                  setConfirmKind(null);
                  void patchStatus("LIVE");
                } else if (confirmKind === "finish") {
                  setConfirmKind(null);
                  void patchStatus("FINISHED");
                } else if (confirmKind === "edit") {
                  setEditMode(true);
                  setConfirmKind(null);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Təsdiqlə
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          {confirmKind === "start"
            ? "Oyunu başlatmaq istədiyinizə əminsiniz? Canlı vaxt server vaxtından etibarən sayılacaq."
            : confirmKind === "finish"
              ? "Oyunu bitirmək istədiyinizə əminsiniz? Nəticə yekun hesab olunacaq. Sonradan redaktə rejimindən dəyişiklik edə bilərsiniz."
              : "Bu bitmiş oyunu redaktə etmək istədiyinizə əminsiniz? Statistika hadisələrə görə yenidən hesablanacaq."}
        </p>
      </AdminModal>
    </AdminPageShell>
  );
}
