import { type ReactNode } from "react";
import { Calendar, ChevronRight, Pencil, Radio } from "lucide-react";
import { groupMatchesByRound } from "../../../../lib/championshipUi";
import { parsePlayoffNotes } from "../../../../lib/playoffBracket";
import type { Match } from "../../../../types/match";
import { MATCH_STATUS_LABEL } from "../constants";
import {
  canEditSchedule,
  formatWhen,
  isFixtureReady,
  matchStatusClass,
} from "../helpers";
import { TeamMark } from "./TeamMark";

export function MatchListSection({
  title,
  matches,
  onSelect,
  onEnter,
  hideHeader = false,
  compact = false,
}: {
  title: string;
  matches: Match[];
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  hideHeader?: boolean;
  compact?: boolean;
}) {
  return (
    <section
      className={
        hideHeader
          ? "min-h-0"
          : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      }
    >
      {!hideHeader ? (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          <span className="text-xs font-semibold text-slate-400">
            {matches.length}
          </span>
        </div>
      ) : null}
      {matches.length === 0 ? (
        <p
          className={`text-center text-sm text-slate-500 ${
            compact ? "px-3 py-10" : "px-4 py-8"
          }`}
        >
          Oyun yoxdur.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {groupMatchesByRound(matches).flatMap((group) => {
            const items: ReactNode[] = [];
            if (group.label) {
              items.push(
                <li
                  key={group.key}
                  className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {group.label}
                </li>,
              );
            }
            for (const match of group.matches) {
              const meta = parsePlayoffNotes(match.notes);
              const ready = isFixtureReady(match);
              const editable = canEditSchedule(match);
              items.push(
            <li key={match.id}>
              <div
                className={`flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${
                  compact ? "px-3 py-3" : "gap-3 px-4 py-4 sm:gap-4"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    ready || !editable ? onEnter(match) : onSelect(match)
                  }
                  className="flex min-w-0 flex-1 flex-col gap-2 text-left transition hover:opacity-90 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div
                    className={`flex shrink-0 items-center gap-2 text-xs text-slate-500 ${
                      compact
                        ? "w-full sm:w-auto"
                        : "w-full sm:w-52 sm:flex-col sm:items-start sm:gap-1"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatWhen(match.scheduledAt)}
                    </span>
                    <span
                      className={`truncate ${
                        match.venue ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {match.venue || "Məkan təyin edilməyib"}
                    </span>
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                    <TeamMark
                      name={match.homeTeam.name}
                      logo={match.homeTeam.logo}
                      align="right"
                      badge={meta?.homeLabel}
                    />
                    <div className="min-w-[3.5rem] text-center sm:min-w-[4.5rem]">
                      {match.status === "SCHEDULED" ||
                      match.status === "POSTPONED" ? (
                        <span className="text-lg font-bold tracking-wide text-slate-300">
                          vs
                        </span>
                      ) : (
                        <span className="text-lg font-black tabular-nums text-ink sm:text-xl">
                          {match.homeScore}:{match.awayScore}
                        </span>
                      )}
                      {match.status === "LIVE" && match.minute != null ? (
                        <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-600">
                          <Radio className="h-3 w-3 animate-pulse" />
                          {match.minute}&apos;
                        </span>
                      ) : null}
                    </div>
                    <TeamMark
                      name={match.awayTeam.name}
                      logo={match.awayTeam.logo}
                      badge={meta?.awayLabel}
                    />
                  </div>
                </button>
                <div className="flex items-center justify-end gap-1">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${matchStatusClass(
                      match.status,
                    )}`}
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
                    disabled={!isFixtureReady(match)}
                    onClick={() => onEnter(match)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    title={
                      isFixtureReady(match)
                        ? "Oyuna gir"
                        : "Əvvəlcə vaxt və məkan seçin"
                    }
                  >
                    Oyuna gir
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              </div>
            </li>,
              );
            }
            return items;
          })}
        </ul>
      )}
    </section>
  );
}
