import { Flag, Radio } from "lucide-react";
import type { MatchClockView } from "../../../../lib/matchClock";
import type { Match } from "../../../../types/match";
import { STATUS_LABEL } from "../constants";
import { formatKickoff, roundedEventMinute } from "../helpers";
import { TeamMark } from "./TeamMark";

export function MatchScoreboard({
  match,
  clock,
}: {
  match: Match;
  clock: MatchClockView | null;
}) {
  const liveMinute =
    match.status === "LIVE" && clock
      ? roundedEventMinute(clock.minute, clock.second)
      : null;

  return (
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
          {liveMinute != null ? ` · ${liveMinute}'` : ""}
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
          {liveMinute != null ? (
            <p className="mt-2 text-lg font-bold tabular-nums text-rose-600">{liveMinute}&apos;</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-400">{formatKickoff(match.scheduledAt)}</p>
        </div>
        <TeamMark name={match.awayTeam.name} logo={match.awayTeam.logo} />
      </div>
    </div>
  );
}
