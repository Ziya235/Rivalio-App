import { Clock, MapPin, Radio } from "lucide-react";
import {
  formatChampDate,
  formatChampTime,
  formatCountdown,
  MATCH_STATUS_LABEL,
  STAGE_LABEL,
  venueOf,
} from "../../lib/championshipUi";
import type { Match } from "../../types/match";
import { ChampEmpty, TeamCrest } from "./ChampShared";

type MatchFilter = "upcoming" | "live" | "finished";

function MatchCard({
  match,
  variant,
  onOpen,
}: {
  match: Match;
  variant: MatchFilter;
  onOpen: (match: Match) => void;
}) {
  const countdown = variant === "upcoming" ? formatCountdown(match.scheduledAt) : null;
  const goals = (match.events ?? []).filter((e) => e.type === "GOAL" || e.type === "OWN_GOAL");
  const cards = (match.events ?? []).filter(
    (e) => e.type === "YELLOW_CARD" || e.type === "RED_CARD",
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(match)}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        variant === "live"
          ? "border-rose-200 bg-gradient-to-br from-rose-50 to-white"
          : "border-gray-200 bg-white/90"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {match.stage ? (
            <span className="rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
              {STAGE_LABEL[match.stage]}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {formatChampDate(match.scheduledAt)} · {formatChampTime(match.scheduledAt)}
          </span>
        </div>
        {variant === "live" ? (
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

      {variant !== "upcoming" && (goals.length > 0 || cards.length > 0) ? (
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-2">
          {goals.map((event) => (
            <p key={event.id} className="text-[11px] text-gray-600">
              ⚽ {event.minute}' {event.player
                ? `${event.player.firstName} ${event.player.lastName}`
                : "Qol"}
              {event.type === "OWN_GOAL" ? " (avtoqol)" : ""}
            </p>
          ))}
          {cards.map((event) => (
            <p key={event.id} className="text-[11px] text-gray-600">
              {event.type === "RED_CARD" ? "🟥" : "🟨"} {event.minute}'{" "}
              {event.player
                ? `${event.player.firstName} ${event.player.lastName}`
                : "Kart"}
            </p>
          ))}
        </div>
      ) : null}
    </button>
  );
}

export function ChampionshipMatches({
  matches,
  filter,
  onFilterChange,
  onOpenMatch,
}: {
  matches: Match[];
  filter: MatchFilter;
  onFilterChange: (filter: MatchFilter) => void;
  onOpenMatch: (match: Match) => void;
}) {
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED" || m.status === "POSTPONED")
    .sort(
      (a, b) =>
        new Date(a.scheduledAt ?? 0).getTime() -
        new Date(b.scheduledAt ?? 0).getTime(),
    );
  const live = matches.filter((m) => m.status === "LIVE");
  const finished = matches
    .filter((m) => m.status === "FINISHED" || m.status === "CANCELLED")
    .sort(
      (a, b) =>
        new Date(b.finishedAt ?? b.scheduledAt ?? 0).getTime() -
        new Date(a.finishedAt ?? a.scheduledAt ?? 0).getTime(),
    );

  const rows =
    filter === "live" ? live : filter === "finished" ? finished : upcoming;
  const empty =
    filter === "live"
      ? "Hazırda canlı oyun yoxdur."
      : filter === "finished"
        ? "Bitmiş oyun yoxdur."
        : "Növbəti oyun yoxdur.";

  const filters: { id: MatchFilter; label: string; count: number }[] = [
    { id: "upcoming", label: "Növbəti", count: upcoming.length },
    { id: "live", label: "Canlı", count: live.length },
    { id: "finished", label: "Bitmiş", count: finished.length },
  ];

  if (matches.length === 0) {
    return <ChampEmpty title="Bu çempionatda hələ oyun yoxdur." />;
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition ${
              filter === item.id
                ? item.id === "live"
                  ? "bg-rose-600 text-white ring-rose-600"
                  : "bg-emerald-500 text-white ring-emerald-500"
                : "bg-white text-gray-500 ring-gray-200 hover:text-gray-800"
            }`}
          >
            {item.id === "live" && item.count > 0 ? (
              <Radio size={12} className="mr-1 inline animate-pulse" />
            ) : null}
            {item.label}
            <span className="ml-1.5 text-xs opacity-80">{item.count}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <ChampEmpty title={empty} />
      ) : (
        <div className="grid gap-3">
          {rows.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              variant={filter}
              onOpen={onOpenMatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
