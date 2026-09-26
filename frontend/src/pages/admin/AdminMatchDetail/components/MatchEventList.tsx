import {
  ArrowLeftRight,
  CircleDot,
  NotebookPen,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Match, MatchEvent, MatchEventType } from "../../../../types/match";
import { eventTitle, playerName } from "../helpers";

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

function eventDetail(event: MatchEvent): string {
  if (event.type === "SUBSTITUTION") {
    return `${playerName(event.playerOut)} → ${playerName(event.playerIn)}`;
  }
  if (event.type === "NOTE") return event.note || "—";
  const who = playerName(event.player);
  return event.assistPlayer ? `${who} · asist: ${playerName(event.assistPlayer)}` : who;
}

function EventRow({
  event,
  side,
  canManage,
  busy,
  onEdit,
  onDelete,
}: {
  event: MatchEvent;
  side: "home" | "away";
  canManage: boolean;
  busy: boolean;
  onEdit: (event: MatchEvent) => void;
  onDelete: (event: MatchEvent) => void;
}) {
  const away = side === "away";

  return (
    <li className={`flex items-start gap-2 px-3 py-3 ${away ? "flex-row-reverse text-right" : ""}`}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        {eventIcon(event.type)}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`flex flex-wrap items-center gap-2 ${away ? "justify-end" : ""}`}>
          <span className="text-xs font-bold tabular-nums text-slate-500">{event.minute}&apos;</span>
          <span className="text-sm font-semibold text-ink">{eventTitle(event)}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">{eventDetail(event)}</p>
      </div>
      {canManage ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(event)}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-ink disabled:opacity-50"
            title="Dəyiş"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(event)}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            title="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </li>
  );
}

function EventColumn({
  name,
  side,
  events,
  canManage,
  busy,
  onEdit,
  onDelete,
}: {
  name: string;
  side: "home" | "away";
  events: MatchEvent[];
  canManage: boolean;
  busy: boolean;
  onEdit: (event: MatchEvent) => void;
  onDelete: (event: MatchEvent) => void;
}) {
  const away = side === "away";

  return (
    <section className={away ? "" : "border-r border-slate-100"}>
      <h3 className={`border-b border-slate-100 px-3 py-2.5 text-sm font-bold text-ink ${away ? "text-right" : "text-left"}`}>
        {name}
      </h3>
      {events.length === 0 ? (
        <p className={`px-3 py-8 text-sm text-slate-400 ${away ? "text-right" : "text-left"}`}>
          Hadisə yoxdur
        </p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              side={side}
              canManage={canManage}
              busy={busy}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function MatchEventList({
  match,
  events,
  canManage,
  busy,
  onEdit,
  onDelete,
}: {
  match: Match;
  events: MatchEvent[];
  canManage: boolean;
  busy: boolean;
  onEdit: (event: MatchEvent) => void;
  onDelete: (event: MatchEvent) => void;
}) {
  const ordered = [...events].sort((left, right) => left.minute - right.minute || left.id - right.id);
  const homeEvents = ordered.filter((event) => event.teamId === match.homeTeamId);
  const awayEvents = ordered.filter((event) => event.teamId === match.awayTeamId);
  const unassigned = ordered.filter(
    (event) => event.teamId !== match.homeTeamId && event.teamId !== match.awayTeamId,
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-bold text-ink">Hadisələr</h2>
      </div>
      {ordered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">
          Hələ hadisə yoxdur. Qol və ya kart əlavə edərək başlayın.
        </p>
      ) : (
        <div className="grid grid-cols-2">
          <EventColumn
            name={match.homeTeam.name}
            side="home"
            events={homeEvents}
            canManage={canManage}
            busy={busy}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          <EventColumn
            name={match.awayTeam.name}
            side="away"
            events={awayEvents}
            canManage={canManage}
            busy={busy}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )}
      {unassigned.length > 0 ? (
        <ul className="divide-y divide-slate-50 border-t border-slate-100">
          {unassigned.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              side="home"
              canManage={canManage}
              busy={busy}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
