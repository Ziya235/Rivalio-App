import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftRight,
  ChevronRight,
  CircleDot,
  Flag,
  NotebookPen,
  Play,
  Radio,
  Square,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { AdminPageShell } from "../../components/admin/AdminLayout";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../components/admin/AdminModal";
import {
  addMatchEvent,
  deleteMatch,
  deleteMatchEvent,
  fetchMatch,
  updateMatch,
} from "../../api/admin";
import { fetchTeam } from "../../api/leagues";
import { fetchTeam as fetchTeamDetail } from "../../api/teams";
import type { TeamPlayer } from "../../types/league";
import type {
  Match,
  MatchEvent,
  MatchEventType,
  MatchStatus,
} from "../../types/match";

const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlaşdırılıb",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv edilib",
  POSTPONED: "Təxirə salınıb",
};

type EventModalKind = "GOAL" | "CARD" | "SUB" | "NOTE" | null;

function playerName(
  p: { firstName: string; lastName: string; shirtNumber?: number | null } | null,
): string {
  if (!p) return "—";
  const num = p.shirtNumber != null ? `#${p.shirtNumber} ` : "";
  return `${num}${p.firstName} ${p.lastName}`.trim();
}

function eventTitle(event: MatchEvent): string {
  switch (event.type) {
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
    case "NOTE":
      return "Qeyd";
    default:
      return event.type;
  }
}

function eventIcon(type: MatchEventType) {
  switch (type) {
    case "GOAL":
    case "OWN_GOAL":
      return <CircleDot className="h-4 w-4 text-emerald-600" />;
    case "YELLOW_CARD":
      return <span className="h-3.5 w-2.5 rounded-sm bg-amber-400" />;
    case "RED_CARD":
      return <span className="h-3.5 w-2.5 rounded-sm bg-rose-500" />;
    case "SUBSTITUTION":
      return <ArrowLeftRight className="h-4 w-4 text-sky-600" />;
    default:
      return <NotebookPen className="h-4 w-4 text-slate-500" />;
  }
}

function TeamMark({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {logo ? (
        <img
          src={logo}
          alt=""
          className="h-14 w-14 rounded-full object-cover shadow ring-2 ring-white"
        />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-bold text-brand shadow ring-2 ring-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="max-w-[9rem] text-sm font-bold text-ink sm:max-w-[12rem]">
        {name}
      </span>
    </div>
  );
}

export function AdminMatchDetailPage() {
  const { matchId: matchIdParam } = useParams();
  const matchId = Number(matchIdParam);
  const navigate = useNavigate();

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
  const [cardType, setCardType] = useState<"YELLOW_CARD" | "RED_CARD">(
    "YELLOW_CARD",
  );
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!Number.isInteger(matchId) || matchId <= 0) {
      setError("Yanlış oyun");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMatch(matchId);
      setMatch(data);
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
          players.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            position: p.position,
            shirtNumber: p.shirtNumber,
            photo: p.photo,
            goals: 0,
            assists: 0,
            matchesPlayed: 0,
            minutes: 0,
          }));
        setHomePlayers(toPlayers(home.players));
        setAwayPlayers(toPlayers(away.players));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oyun yüklənmədi");
      setMatch(null);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const playersForTeam = useMemo(() => {
    if (!match || !teamId) return [];
    if (teamId === match.homeTeamId) return homePlayers;
    if (teamId === match.awayTeamId) return awayPlayers;
    return [];
  }, [match, teamId, homePlayers, awayPlayers]);

  const resetEventForm = (kind: EventModalKind) => {
    const defaultMinute =
      match?.minute != null ? String(match.minute) : kind === "NOTE" ? "0" : "1";
    setMinute(defaultMinute);
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

  const openEventModal = (kind: EventModalKind) => {
    if (match?.status !== "LIVE") {
      alert("Əvvəlcə oyun başladılmalıdır");
      return;
    }
    resetEventForm(kind);
    setEventKind(kind);
  };

  const patchStatus = async (status: MatchStatus) => {
    if (!match) return;
    setBusy(true);
    try {
      const updated = await updateMatch(match.id, { status });
      setMatch(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Yenilənmədi");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!match) return;
    if (
      !window.confirm(
        `"${match.homeTeam.name} vs ${match.awayTeam.name}" oyununu silmək istəyirsiniz?`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteMatch(match.id);
      navigate(
        match.league?.id
          ? `/admin/football/matches?leagueId=${match.league.id}`
          : match.championshipId
            ? `/admin/football/championships/${match.championshipId}`
            : "/admin/football/matches",
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinmədi");
      setBusy(false);
    }
  };

  const handleAddEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!match || !eventKind) return;

    const minuteValue = Number(minute);
    if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 130) {
      setFormError("Dəqiqə 0–130 arası olmalıdır");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      let payload;
      if (eventKind === "GOAL") {
        if (!teamId) {
          setFormError("Komanda seçin");
          setSubmitting(false);
          return;
        }
        payload = {
          type: (isOwnGoal ? "OWN_GOAL" : "GOAL") as MatchEventType,
          minute: minuteValue,
          teamId: Number(teamId),
          playerId: playerId ? Number(playerId) : undefined,
          assistPlayerId:
            !isOwnGoal && assistPlayerId
              ? Number(assistPlayerId)
              : undefined,
        };
      } else if (eventKind === "CARD") {
        if (!teamId) {
          setFormError("Komanda seçin");
          setSubmitting(false);
          return;
        }
        payload = {
          type: cardType,
          minute: minuteValue,
          teamId: Number(teamId),
          playerId: playerId ? Number(playerId) : undefined,
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
        payload = {
          type: "NOTE" as const,
          minute: minuteValue,
          teamId: teamId ? Number(teamId) : undefined,
          note: note.trim() || undefined,
        };
      }

      const result = await addMatchEvent(match.id, payload);
      setMatch(result.match);
      setEventKind(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Hadisə əlavə olunmadı",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!match) return;
    if (!window.confirm("Bu hadisəni silmək istəyirsiniz?")) return;
    setBusy(true);
    try {
      const updated = await deleteMatchEvent(match.id, eventId);
      setMatch(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinmədi");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>
    );
  }

  if (error || !match) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-rose-600">{error || "Oyun tapılmadı"}</p>
        <Link to="/admin/football/matches" className="text-sm font-semibold text-brand">
          ← Oyunlara qayıt
        </Link>
      </div>
    );
  }

  const events = match.events ?? [];
  const canManageEvents =
    match.status === "SCHEDULED" ||
    match.status === "LIVE" ||
    match.status === "FINISHED";

  const eventModalTitle =
    eventKind === "GOAL"
      ? "Qol əlavə et"
      : eventKind === "CARD"
        ? "Kart əlavə et"
        : eventKind === "SUB"
          ? "Dəyişiklik"
          : "Qeyd əlavə et";

  return (
    <AdminPageShell
      title={`${match.homeTeam.name} — ${match.awayTeam.name}`}
      subtitle={`${
        match.league?.name ?? match.championship?.name ?? "Çempionat"
      }${match.round ? ` · ${match.round}-ci tur` : ""}${
        match.venue ? ` · ${match.venue}` : ""
      }`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {match.status === "SCHEDULED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void patchStatus("LIVE")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Başlat
            </button>
          ) : null}
          {match.status === "LIVE" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void patchStatus("FINISHED")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5" />
              Bitir
            </button>
          ) : null}
          {match.status === "FINISHED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void patchStatus("LIVE")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Radio className="h-4 w-4" />
              Yenidən aç
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDeleteMatch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Sil
          </button>
        </div>
      }
    >
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-slate-500">
        <Link
          to={
            match.league?.id
              ? `/admin/football/matches?leagueId=${match.league.id}`
              : match.championshipId
                ? `/admin/football/championships/${match.championshipId}`
                : "/admin/football/matches"
          }
          className="hover:text-brand"
        >
          Oyunlar
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">İdarəetmə</span>
      </nav>

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-sm">
        <div className="flex items-center justify-between px-4 pt-4 sm:px-6">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
              match.status === "LIVE"
                ? "bg-rose-50 text-rose-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {match.status === "LIVE" ? (
              <Radio className="h-3.5 w-3.5 animate-pulse" />
            ) : (
              <Flag className="h-3.5 w-3.5" />
            )}
            {STATUS_LABEL[match.status]}
            {match.status === "LIVE" && match.minute != null
              ? ` · ${match.minute}'`
              : ""}
          </span>
          <span className="text-xs text-slate-400">
            {match.matchType === "FRIENDLY"
              ? "Yoldaşlıq"
              : match.matchType === "CHAMPIONSHIP"
                ? "Çempionat"
                : "Liqa oyunu"}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-8 sm:px-8">
          <TeamMark name={match.homeTeam.name} logo={match.homeTeam.logo} />
          <div className="text-center">
            <p className="text-4xl font-black tabular-nums tracking-tight text-ink sm:text-5xl">
              {match.homeScore}
              <span className="mx-1 text-slate-300">:</span>
              {match.awayScore}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {match.scheduledAt
                ? new Date(match.scheduledAt).toLocaleString("az-AZ", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Vaxt təyin edilməyib"}
            </p>
          </div>
          <TeamMark name={match.awayTeam.name} logo={match.awayTeam.logo} />
        </div>
      </div>

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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-bold text-ink">Hadisələr</h2>
        </div>
        {events.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Hələ hadisə yoxdur. Qol və ya kart əlavə edərək başlayın.
          </p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50/60"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                  {eventIcon(event.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold tabular-nums text-slate-500">
                      {event.minute}&apos;
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {eventTitle(event)}
                    </span>
                    {event.team ? (
                      <span className="text-xs text-slate-400">
                        · {event.team.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {event.type === "SUBSTITUTION"
                      ? `${playerName(event.playerOut)} → ${playerName(event.playerIn)}`
                      : event.type === "NOTE"
                        ? event.note || "—"
                        : playerName(event.player)}
                    {event.assistPlayer
                      ? ` · asist: ${playerName(event.assistPlayer)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeleteEvent(event.id)}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AdminModal
        open={eventKind != null}
        title={eventModalTitle}
        onClose={() => !submitting && setEventKind(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setEventKind(null)}
              disabled={submitting}
            />
            <ModalSubmitButton
              formId="match-event-form"
              label="Əlavə et"
              loading={submitting}
            />
          </>
        }
      >
        <ModalForm id="match-event-form" onSubmit={handleAddEvent}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dəqiqə" required>
              <input
                type="number"
                min={0}
                max={130}
                className={inputClass}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                required
              />
            </Field>
            <Field label="Komanda" required={eventKind !== "NOTE"}>
              <select
                className={inputClass}
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value ? Number(e.target.value) : "");
                  setPlayerId("");
                  setAssistPlayerId("");
                  setPlayerInId("");
                  setPlayerOutId("");
                }}
                required={eventKind !== "NOTE"}
              >
                {eventKind === "NOTE" ? (
                  <option value="">Yoxdur</option>
                ) : (
                  <option value="">Seçin...</option>
                )}
                <option value={match.homeTeamId}>{match.homeTeam.name}</option>
                <option value={match.awayTeamId}>{match.awayTeam.name}</option>
              </select>
            </Field>
          </div>

          {eventKind === "GOAL" ? (
            <>
              <Field label="Oyunçu">
                <select
                  className={inputClass}
                  value={playerId}
                  onChange={(e) =>
                    setPlayerId(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={!teamId}
                >
                  <option value="">Seçilməyib</option>
                  {playersForTeam.map((p) => (
                    <option key={p.id} value={p.id}>
                      {playerName(p)}
                    </option>
                  ))}
                </select>
              </Field>
              {!isOwnGoal ? (
                <Field label="Asist">
                  <select
                    className={inputClass}
                    value={assistPlayerId}
                    onChange={(e) =>
                      setAssistPlayerId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    disabled={!teamId}
                  >
                    <option value="">Yoxdur</option>
                    {playersForTeam
                      .filter((p) => p.id !== playerId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {playerName(p)}
                        </option>
                      ))}
                  </select>
                </Field>
              ) : null}
              <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isOwnGoal}
                  onChange={(e) => setIsOwnGoal(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Avtoqol (rəqib hesabına yazılır)
              </label>
            </>
          ) : null}

          {eventKind === "CARD" ? (
            <>
              <Field label="Kart növü" required>
                <select
                  className={inputClass}
                  value={cardType}
                  onChange={(e) =>
                    setCardType(e.target.value as "YELLOW_CARD" | "RED_CARD")
                  }
                >
                  <option value="YELLOW_CARD">Sarı</option>
                  <option value="RED_CARD">Qırmızı</option>
                </select>
              </Field>
              <Field label="Oyunçu">
                <select
                  className={inputClass}
                  value={playerId}
                  onChange={(e) =>
                    setPlayerId(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={!teamId}
                >
                  <option value="">Seçilməyib</option>
                  {playersForTeam.map((p) => (
                    <option key={p.id} value={p.id}>
                      {playerName(p)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : null}

          {eventKind === "SUB" ? (
            <>
              <Field label="Çıxan oyunçu" required>
                <select
                  className={inputClass}
                  value={playerOutId}
                  onChange={(e) =>
                    setPlayerOutId(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={!teamId}
                  required
                >
                  <option value="">Seçin...</option>
                  {playersForTeam.map((p) => (
                    <option key={p.id} value={p.id}>
                      {playerName(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Daxil olan oyunçu" required>
                <select
                  className={inputClass}
                  value={playerInId}
                  onChange={(e) =>
                    setPlayerInId(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={!teamId}
                  required
                >
                  <option value="">Seçin...</option>
                  {playersForTeam
                    .filter((p) => p.id !== playerOutId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {playerName(p)}
                      </option>
                    ))}
                </select>
              </Field>
            </>
          ) : null}

          {eventKind === "NOTE" ? (
            <Field label="Mətn">
              <textarea
                className={`${inputClass} min-h-[88px] resize-y`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Qeyd yazın..."
              />
            </Field>
          ) : null}

          {formError ? (
            <p className="mb-2 text-sm text-rose-600">{formError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>
    </AdminPageShell>
  );
}
