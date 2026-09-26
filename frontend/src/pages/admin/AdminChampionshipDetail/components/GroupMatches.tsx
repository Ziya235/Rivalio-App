import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChampionshipRound } from "../../../../lib/championshipRounds";
import type { Match } from "../../../../types/match";
import { canEditSchedule, formatCompactWhen, isFixtureReady } from "../helpers";
import { TeamMark } from "./TeamMark";

function scoreText(match: Match): string {
  if (match.status === "SCHEDULED" || match.status === "POSTPONED") return "—:—";
  return `${match.homeScore}:${match.awayScore}`;
}

export function GroupMatches({
  groupName,
  rounds,
  currentRound,
  onSelect,
  onEnter,
  allowSchedule,
}: {
  groupName: string;
  rounds: ChampionshipRound[];
  currentRound: number | null;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  allowSchedule: boolean;
}) {
  const currentRef = useRef<HTMLDivElement>(null);
  const many = rounds.length > 4;
  const [picked, setPicked] = useState<number | null>(null);
  const activeIndex = Math.max(
    0,
    rounds.findIndex((round) => round.round === (picked ?? currentRound)),
  );
  const visible = many ? rounds.slice(activeIndex, activeIndex + 1) : rounds;
  const matchCount = rounds.reduce((sum, round) => sum + round.matches.length, 0);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentRound, groupName]);

  return (
    <section className="flex max-h-[40rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h3 className="text-base font-extrabold text-ink">{groupName} — Oyunlar</h3>
        <span className="text-xs font-semibold text-slate-400">{matchCount} oyun</span>
      </div>
      {many ? (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <button
            type="button"
            aria-label="Əvvəlki tur"
            disabled={activeIndex <= 0}
            onClick={() => {
              const previous = rounds[activeIndex - 1];
              if (previous) setPicked(previous.round);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Əvvəlki
          </button>
          <span className="text-sm font-extrabold text-ink">
            {rounds[activeIndex]?.label}
            {rounds[activeIndex]?.round === currentRound ? (
              <span className="ml-2 text-[11px] font-bold text-lime-700">Cari</span>
            ) : null}
          </span>
          <button
            type="button"
            aria-label="Növbəti tur"
            disabled={activeIndex >= rounds.length - 1}
            onClick={() => {
              const next = rounds[activeIndex + 1];
              if (next) setPicked(next.round);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Növbəti
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Oyun yoxdur.</p>
        ) : (
          visible.map((round) => {
            const isCurrent = round.round === currentRound;
            return (
              <div
                key={round.key}
                ref={isCurrent ? currentRef : undefined}
                className={isCurrent ? "bg-lime-50/40" : undefined}
              >
                {round.matches.map((match, index) => {
                  const ready = isFixtureReady(match);
                  const editable = allowSchedule && canEditSchedule(match);
                  const open = () => (ready || !editable ? onEnter(match) : onSelect(match));
                  return (
                    <div key={match.id} className="border-b border-slate-100 last:border-0">
                      {index === 0 ? (
                        <div className="flex items-center justify-between px-4 pt-3">
                          <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                            {round.label.toLocaleUpperCase("az")}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {formatCompactWhen(match.scheduledAt)}
                          </span>
                        </div>
                      ) : (
                        <div className="px-4 pt-3 text-right text-[11px] font-medium text-slate-400">
                          {formatCompactWhen(match.scheduledAt)}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={open}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                      >
                        <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <TeamMark
                            name={match.homeTeam.name}
                            logo={match.homeTeam.logo}
                            align="right"
                            size="sm"
                          />
                          <span
                            className={`min-w-12 text-center text-sm font-black tabular-nums ${
                              match.status === "SCHEDULED" || match.status === "POSTPONED"
                                ? "text-slate-300"
                                : "text-ink"
                            }`}
                          >
                            {scoreText(match)}
                          </span>
                          <TeamMark name={match.awayTeam.name} logo={match.awayTeam.logo} size="sm" />
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
