import { ChevronRight, Pencil, Radio } from "lucide-react";
import { livePlayingMinute } from "../../../../lib/matchClock";
import type { Match } from "../../../../types/match";
import { MATCH_STATUS_LABEL } from "../constants";
import { canEditSchedule, formatCompactWhen, isFixtureReady, matchStatusClass } from "../helpers";
import { TeamMark } from "./TeamMark";

function scoreLabel(match: Match): string {
  if (match.status === "SCHEDULED" || match.status === "POSTPONED") return "— : —";
  return `${match.homeScore} : ${match.awayScore}`;
}

export function FixtureRow({
  match,
  onSelect,
  onEnter,
  allowSchedule = true,
  nowMs,
}: {
  match: Match;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  allowSchedule?: boolean;
  nowMs?: number;
}) {
  const ready = isFixtureReady(match);
  const editable = allowSchedule && canEditSchedule(match);
  const minute = livePlayingMinute(match, nowMs);

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <button
        type="button"
        onClick={() => (ready || !editable ? onEnter(match) : onSelect(match))}
        className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 text-left"
      >
        <TeamMark name={match.homeTeam.name} logo={match.homeTeam.logo} align="right" size="sm" />
        <span
          className={`min-w-[4.5rem] text-center text-base font-black tabular-nums ${
            match.status === "SCHEDULED" || match.status === "POSTPONED"
              ? "text-slate-300"
              : "text-ink"
          }`}
        >
          {scoreLabel(match)}
          {minute != null ? (
            <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-600">
              <Radio className="h-3 w-3 animate-pulse" />
              {minute}&apos;
            </span>
          ) : null}
        </span>
        <TeamMark name={match.awayTeam.name} logo={match.awayTeam.logo} size="sm" />
      </button>
      <div className="flex shrink-0 items-center justify-end gap-1.5">
        <span className="hidden text-[11px] text-slate-400 sm:inline">
          {formatCompactWhen(match.scheduledAt)}
        </span>
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${matchStatusClass(match.status)}`}
        >
          {MATCH_STATUS_LABEL[match.status]}
        </span>
        {editable ? (
          <button
            type="button"
            onClick={() => onSelect(match)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
            title="Vaxt və məkan"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={!ready}
          onClick={() => onEnter(match)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          title={ready ? "Oyuna gir" : "Əvvəlcə vaxt və məkan seçin"}
        >
          <span className="hidden sm:inline">Oyuna gir</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>
      </div>
    </div>
  );
}
