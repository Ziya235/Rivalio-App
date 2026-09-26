import { Radio } from "lucide-react";
import { livePlayingMinute } from "../../lib/matchClock";
import { formatChampDate, formatChampTime, venueOf } from "../../lib/championshipUi";
import { parsePlayoffNotes } from "../../lib/playoffBracket";
import type { Match } from "../../types/match";
import { TeamCrest } from "./ChampShared";

function kickoffLabel(iso: string | null | undefined): string {
  if (!iso) return "Vaxt yoxdur";
  const date = formatChampDate(iso);
  const time = formatChampTime(iso);
  if (date === "—" || time === "—") return "Vaxt yoxdur";
  return `${date}, ${time}`;
}

function placeLabel(match: Match): string | null {
  if (!match.venue && !match.location) return null;
  return venueOf(match);
}

export function PublicMatchLine({
  match,
  nowMs,
  onOpen,
}: {
  match: Match;
  nowMs?: number;
  onOpen: (match: Match) => void;
}) {
  const minute = livePlayingMinute(match, nowMs);
  const scheduled = match.status === "SCHEDULED" || match.status === "POSTPONED";
  const meta = parsePlayoffNotes(match.notes);
  const place = placeLabel(match);

  return (
    <button
      type="button"
      onClick={() => onOpen(match)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
    >
      <span className="w-[8.5rem] shrink-0 sm:w-40">
        <span className="block text-[11px] font-semibold leading-snug text-slate-600">
          {kickoffLabel(match.scheduledAt)}
        </span>
        {place ? (
          <span className="mt-0.5 block truncate text-[11px] text-slate-400">{place}</span>
        ) : null}
      </span>
      <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="flex min-w-0 flex-row-reverse items-center gap-2">
          <TeamCrest name={match.homeTeam.name} logo={match.homeTeam.logo} size="sm" />
          <span className="min-w-0 text-right">
            <span className="block truncate text-sm font-semibold text-ink">{match.homeTeam.name}</span>
            {meta?.homeLabel ? (
              <span className="block truncate text-[10px] font-semibold text-slate-400">{meta.homeLabel}</span>
            ) : null}
          </span>
        </span>
        <span className="min-w-[4.5rem] text-center">
          <span className={`block text-base font-black tabular-nums ${scheduled ? "text-slate-300" : "text-ink"}`}>
            {scheduled ? "— : —" : `${match.homeScore} : ${match.awayScore}`}
          </span>
          {minute != null ? (
            <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-600">
              <Radio className="h-3 w-3 animate-pulse" />
              {minute}&apos;
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <TeamCrest name={match.awayTeam.name} logo={match.awayTeam.logo} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{match.awayTeam.name}</span>
            {meta?.awayLabel ? (
              <span className="block truncate text-[10px] font-semibold text-slate-400">{meta.awayLabel}</span>
            ) : null}
          </span>
        </span>
      </span>
    </button>
  );
}
