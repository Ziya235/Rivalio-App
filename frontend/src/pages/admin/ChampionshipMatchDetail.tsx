import { type FormEvent, useMemo, useState } from "react";
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
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../components/admin/AdminModal";
import {
  applyMatchEvent,
  removeMatchEvent,
  type GroupMatch,
  type GroupMatchEvent,
  type GroupMatchEventType,
  type GroupMatchStatus,
} from "../../lib/roundRobin";

type Team = { id: string; name: string };

const STATUS_LABEL: Record<GroupMatchStatus, string> = {
  SCHEDULED: "Planlaşdırılıb",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv edilib",
  POSTPONED: "Təxirə salınıb",
};

type EventModalKind = "GOAL" | "CARD" | "SUB" | "NOTE" | null;

function eventTitle(type: GroupMatchEventType): string {
  switch (type) {
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
  }
}

function eventIcon(type: GroupMatchEventType) {
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

function TeamMark({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-bold text-brand shadow ring-2 ring-white">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="max-w-[9rem] text-sm font-bold text-ink sm:max-w-[12rem]">
        {name}
      </span>
    </div>
  );
}

export function ChampionshipMatchDetail({
  match,
  homeTeam,
  awayTeam,
  groupName,
  onChange,
  onDelete,
  onBack,
}: {
  match: GroupMatch;
  homeTeam: Team;
  awayTeam: Team;
  groupName: string;
  onChange: (next: GroupMatch) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [eventKind, setEventKind] = useState<EventModalKind>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [minute, setMinute] = useState("1");
  const [teamId, setTeamId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [assistName, setAssistName] = useState("");
  const [playerInName, setPlayerInName] = useState("");
  const [playerOutName, setPlayerOutName] = useState("");
  const [cardType, setCardType] = useState<"YELLOW_CARD" | "RED_CARD">(
    "YELLOW_CARD",
  );
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [note, setNote] = useState("");

  const teamName = useMemo(() => {
    const map = new Map([
      [homeTeam.id, homeTeam.name],
      [awayTeam.id, awayTeam.name],
    ]);
    return (id: string | null) => (id ? map.get(id) ?? id : null);
  }, [homeTeam, awayTeam]);

  const resetEventForm = (kind: EventModalKind) => {
    setMinute(
      match.minute != null ? String(match.minute) : kind === "NOTE" ? "0" : "1",
    );
    setTeamId(homeTeam.id);
    setPlayerName("");
    setAssistName("");
    setPlayerInName("");
    setPlayerOutName("");
    setCardType("YELLOW_CARD");
    setIsOwnGoal(false);
    setNote("");
    setFormError(null);
  };

  const openEventModal = (kind: EventModalKind) => {
    if (match.status !== "LIVE") {
      alert("Əvvəlcə oyun başladılmalıdır");
      return;
    }
    resetEventForm(kind);
    setEventKind(kind);
  };

  const setStatus = (status: GroupMatchStatus) => {
    onChange({
      ...match,
      status,
      minute: status === "LIVE" ? (match.minute ?? 1) : match.minute,
    });
  };

  const handleAddEvent = (e: FormEvent) => {
    e.preventDefault();
    if (!eventKind) return;

    const minuteValue = Number(minute);
    if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 130) {
      setFormError("Dəqiqə 0–130 arası olmalıdır");
      return;
    }

    if (eventKind === "GOAL") {
      if (!teamId) {
        setFormError("Komanda seçin");
        return;
      }
      onChange(
        applyMatchEvent(match, {
          type: isOwnGoal ? "OWN_GOAL" : "GOAL",
          minute: minuteValue,
          teamId,
          playerName: playerName.trim() || null,
          assistName: !isOwnGoal && assistName.trim() ? assistName.trim() : null,
          playerInName: null,
          playerOutName: null,
          note: null,
        }),
      );
    } else if (eventKind === "CARD") {
      if (!teamId) {
        setFormError("Komanda seçin");
        return;
      }
      onChange(
        applyMatchEvent(match, {
          type: cardType,
          minute: minuteValue,
          teamId,
          playerName: playerName.trim() || null,
          assistName: null,
          playerInName: null,
          playerOutName: null,
          note: null,
        }),
      );
    } else if (eventKind === "SUB") {
      if (!teamId || !playerInName.trim() || !playerOutName.trim()) {
        setFormError("Komanda və hər iki oyunçu lazımdır");
        return;
      }
      onChange(
        applyMatchEvent(match, {
          type: "SUBSTITUTION",
          minute: minuteValue,
          teamId,
          playerName: null,
          assistName: null,
          playerInName: playerInName.trim(),
          playerOutName: playerOutName.trim(),
          note: null,
        }),
      );
    } else {
      onChange(
        applyMatchEvent(match, {
          type: "NOTE",
          minute: minuteValue,
          teamId: teamId || null,
          playerName: null,
          assistName: null,
          playerInName: null,
          playerOutName: null,
          note: note.trim() || null,
        }),
      );
    }

    setEventKind(null);
  };

  const handleDeleteEvent = (event: GroupMatchEvent) => {
    if (!window.confirm("Bu hadisəni silmək istəyirsiniz?")) return;
    onChange(removeMatchEvent(match, event.id));
  };

  const handleDeleteMatch = () => {
    if (
      !window.confirm(
        `"${homeTeam.name} vs ${awayTeam.name}" oyununu silmək istəyirsiniz?`,
      )
    ) {
      return;
    }
    onDelete();
  };

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
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 text-sm font-semibold text-slate-500 hover:text-ink"
          >
            ← Qrup mərhələsinə qayıt
          </button>
          <nav className="mb-1 flex items-center gap-1.5 text-sm text-slate-500">
            <span>{groupName}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-ink">Oyun idarəetməsi</span>
          </nav>
          <h2 className="text-xl font-extrabold text-ink">
            {homeTeam.name} — {awayTeam.name}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {match.round ? `${match.round}-ci tur` : "Tur yoxdur"}
            {match.venue ? ` · ${match.venue}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {match.status === "SCHEDULED" ? (
            <button
              type="button"
              onClick={() => setStatus("LIVE")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Play className="h-4 w-4" />
              Başlat
            </button>
          ) : null}
          {match.status === "LIVE" ? (
            <button
              type="button"
              onClick={() => setStatus("FINISHED")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Square className="h-3.5 w-3.5" />
              Bitir
            </button>
          ) : null}
          {match.status === "FINISHED" ? (
            <button
              type="button"
              onClick={() => setStatus("LIVE")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Radio className="h-4 w-4" />
              Yenidən aç
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleDeleteMatch}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            Sil
          </button>
        </div>
      </div>

      {match.status === "FINISHED" ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Oyun bitdi — hesab <strong>{homeTeam.name} {match.homeScore}:{match.awayScore} {awayTeam.name}</strong> qrup cədvəlinə düşüb.
        </div>
      ) : null}

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
          <span className="text-xs text-slate-400">Qrup oyunu</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-8 sm:px-8">
          <TeamMark name={homeTeam.name} />
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
          <TeamMark name={awayTeam.name} />
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
          <h3 className="text-base font-bold text-ink">Hadisələr</h3>
        </div>
        {match.events.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Hələ hadisə yoxdur. Qol və ya kart əlavə edərək başlayın.
          </p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {match.events.map((event) => (
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
                      {eventTitle(event.type)}
                    </span>
                    {event.teamId ? (
                      <span className="text-xs text-slate-400">
                        · {teamName(event.teamId)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {event.type === "SUBSTITUTION"
                      ? `${event.playerOutName ?? "—"} → ${event.playerInName ?? "—"}`
                      : event.type === "NOTE"
                        ? event.note || "—"
                        : event.playerName || "—"}
                    {event.assistName ? ` · asist: ${event.assistName}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(event)}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
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
        onClose={() => setEventKind(null)}
        footer={
          <>
            <ModalCancelButton onClick={() => setEventKind(null)} />
            <ModalSubmitButton formId="champ-match-event" label="Əlavə et" />
          </>
        }
      >
        <ModalForm id="champ-match-event" onSubmit={handleAddEvent}>
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
                onChange={(e) => setTeamId(e.target.value)}
              >
                <option value={homeTeam.id}>{homeTeam.name}</option>
                <option value={awayTeam.id}>{awayTeam.name}</option>
              </select>
            </Field>
          </div>

          {eventKind === "GOAL" ? (
            <>
              <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isOwnGoal}
                  onChange={(e) => setIsOwnGoal(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Avtoqol
              </label>
              <Field label="Oyunçu (optional)">
                <input
                  className={inputClass}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Qolu vuran"
                />
              </Field>
              {!isOwnGoal ? (
                <Field label="Asist (optional)">
                  <input
                    className={inputClass}
                    value={assistName}
                    onChange={(e) => setAssistName(e.target.value)}
                  />
                </Field>
              ) : null}
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
              <Field label="Oyunçu (optional)">
                <input
                  className={inputClass}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </Field>
            </>
          ) : null}

          {eventKind === "SUB" ? (
            <>
              <Field label="Çıxan oyunçu" required>
                <input
                  className={inputClass}
                  value={playerOutName}
                  onChange={(e) => setPlayerOutName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Daxil olan oyunçu" required>
                <input
                  className={inputClass}
                  value={playerInName}
                  onChange={(e) => setPlayerInName(e.target.value)}
                  required
                />
              </Field>
            </>
          ) : null}

          {eventKind === "NOTE" ? (
            <Field label="Qeyd">
              <textarea
                className={inputClass}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          ) : null}

          {formError ? (
            <p className="text-sm font-medium text-rose-600">{formError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>
    </div>
  );
}
