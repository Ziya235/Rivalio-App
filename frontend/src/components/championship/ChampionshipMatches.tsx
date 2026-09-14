import { Clock, MapPin } from "lucide-react";
import {
  formatChampDate,
  formatChampTime,
  formatCountdown,
  MATCH_STATUS_LABEL,
  groupMatchesByRound,
  venueOf,
} from "../../lib/championshipUi";
import type { Match } from "../../types/match";
import { ChampEmpty, TeamCrest } from "./ChampShared";

function MatchCard({
  match,
  onOpen,
}: {
  match: Match;
  onOpen: (match: Match) => void;
}) {
  const countdown =
    match.status === "SCHEDULED" || match.status === "POSTPONED"
      ? formatCountdown(match.scheduledAt)
      : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(match)}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        match.status === "LIVE"
          ? "border-rose-200 bg-gradient-to-br from-rose-50 to-white"
          : "border-gray-200 bg-white/90"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <Clock size={12} />
          {formatChampDate(match.scheduledAt)} · {formatChampTime(match.scheduledAt)}
        </span>
        {match.status === "LIVE" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            LIVE {match.minute != null ? `${match.minute}'` : ""}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-gray-400">
            {MATCH_STATUS_LABEL[match.status]}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 flex-row-reverse items-center gap-2">
          <TeamCrest name={match.homeTeam.name} logo={match.homeTeam.logo} />
          <span className="truncate font-semibold text-gray-900">
            {match.homeTeam.name}
          </span>
        </div>
        <div className="min-w-[4.5rem] text-center">
          {match.status === "SCHEDULED" || match.status === "POSTPONED" ? (
            <span className="font-display text-xl font-bold tracking-wide text-gray-300">
              VS
            </span>
          ) : (
            <span className="font-display text-2xl font-black tabular-nums text-gray-900">
              {match.homeScore} - {match.awayScore}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <TeamCrest name={match.awayTeam.name} logo={match.awayTeam.logo} />
          <span className="truncate font-semibold text-gray-900">
            {match.awayTeam.name}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <MapPin size={11} />
          {venueOf(match)}
        </span>
        {countdown ? (
          <span className="font-semibold text-sky-600">{countdown}</span>
        ) : null}
      </div>
    </button>
  );
}

export function ChampionshipMatches({
  matches,
  onOpenMatch,
}: {
  matches: Match[];
  onOpenMatch: (match: Match) => void;
}) {
  const groups = [...groupMatchesByRound(matches)].reverse();

  if (matches.length === 0) {
    return <ChampEmpty title="Bu çempionatda hələ oyun yoxdur." />;
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-base font-bold text-gray-900">
              {group.label ?? "Oyunlar"}
            </h3>
            <span className="text-xs font-semibold text-gray-400">
              {group.matches.length} oyun
            </span>
          </div>
          <div className="grid gap-3">
            {group.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onOpen={onOpenMatch}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
