import {
  ArrowLeftRight,
  CircleDot,
  NotebookPen,
  Pencil,
  Trash2,
} from "lucide-react";
import type { MatchEvent, MatchEventType } from "../../../../types/match";
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

export function MatchEventList({
  events,
  canManage,
  busy,
  onEdit,
  onDelete,
}: {
  events: MatchEvent[];
  canManage: boolean;
  busy: boolean;
  onEdit: (event: MatchEvent) => void;
  onDelete: (event: MatchEvent) => void;
}) {
  return (
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
                  <span className="text-sm font-semibold text-ink">{eventTitle(event)}</span>
                  {event.team ? (
                    <span className="text-xs text-slate-400">· {event.team.name}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-slate-600">
                  {event.type === "SUBSTITUTION"
                    ? `${playerName(event.playerOut)} → ${playerName(event.playerIn)}`
                    : event.type === "NOTE"
                      ? event.note || "—"
                      : playerName(event.player)}
                  {event.assistPlayer ? ` · asist: ${playerName(event.assistPlayer)}` : ""}
                </p>
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
          ))}
        </ul>
      )}
    </div>
  );
}
