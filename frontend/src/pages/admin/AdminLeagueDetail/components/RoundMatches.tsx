import { Calendar, ChevronRight, Pencil, Radio } from "lucide-react";
import { ROUND_STATUS_LABEL, STATUS_LABEL } from "../constants";
import {
  canEditSchedule,
  formatWhen,
  isFixtureReady,
  statusBadgeClass,
  type LeagueRoundGroup,
} from "../helpers";
import type { Match } from "../../../../types/match";
import { TeamMark } from "./TeamMark";

function MatchRow({
  match,
  onSelect,
  onEnter,
}: {
  match: Match;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  const ready = isFixtureReady(match);
  const editable = canEditSchedule(match);

  return (
    <li>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={() => (ready || !editable ? onEnter(match) : onSelect(match))}
          className="flex min-w-0 flex-1 flex-col gap-2 text-left transition hover:opacity-90 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="flex w-full shrink-0 items-center gap-2 text-xs text-slate-500 sm:w-52 sm:flex-col sm:items-start sm:gap-1">
            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
              <Calendar className="h-3.5 w-3.5" />
              {formatWhen(match.scheduledAt)}
            </span>
            <span className={`truncate ${match.venue ? "text-slate-500" : "text-slate-400"}`}>
              {match.venue || "Məkan təyin edilməyib"}
            </span>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamMark name={match.homeTeam.name} logo={match.homeTeam.logo} align="right" />
            <div className="min-w-[4.5rem] text-center">
              {match.status === "SCHEDULED" || match.status === "POSTPONED" ? (
                <span className="inline-flex min-w-14 items-center justify-center rounded-lg border border-dashed border-slate-200 px-2 py-1 text-sm font-bold tracking-wide text-slate-300">
                  vs
                </span>
              ) : (
                <span className="inline-flex min-w-14 items-center justify-center rounded-lg bg-ink px-2 py-1 text-sm font-black tabular-nums text-white">
                  {match.homeScore} : {match.awayScore}
                </span>
              )}
              {match.status === "LIVE" && match.minute != null ? (
                <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-600">
                  <Radio className="h-3 w-3 animate-pulse" />
                  {match.minute}&apos;
                </span>
              ) : null}
            </div>
            <TeamMark name={match.awayTeam.name} logo={match.awayTeam.logo} />
          </div>
        </button>
        <div className="flex items-center justify-end gap-1">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(match.status)}`}
          >
            {STATUS_LABEL[match.status]}
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
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            title={ready ? "Oyuna gir" : "Əvvəlcə vaxt və məkan seçin"}
          >
            Oyuna gir
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </button>
        </div>
      </div>
    </li>
  );
}

function statusTone(status: LeagueRoundGroup["status"]): string {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "current") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-500";
}

export function RoundMatches({
  round,
  onSelect,
  onEnter,
}: {
  round: LeagueRoundGroup;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-ink">{round.label}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(round.status)}`}
            >
              {ROUND_STATUS_LABEL[round.status]}
            </span>
          </div>
          {round.dateLabel ? (
            <p className="mt-0.5 text-xs text-slate-500">{round.dateLabel}</p>
          ) : null}
        </div>
        <span className="text-xs font-semibold text-slate-400">
          {round.matches.length} oyun
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {round.matches.map((match) => (
          <MatchRow key={match.id} match={match} onSelect={onSelect} onEnter={onEnter} />
        ))}
      </ul>
    </section>
  );
}

export function MatchList({
  matches,
  empty,
  onSelect,
  onEnter,
}: {
  matches: Match[];
  empty: string;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  if (matches.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <p className="px-4 py-8 text-center text-sm text-slate-500">{empty}</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {matches.map((match) => (
          <MatchRow key={match.id} match={match} onSelect={onSelect} onEnter={onEnter} />
        ))}
      </ul>
    </section>
  );
}
