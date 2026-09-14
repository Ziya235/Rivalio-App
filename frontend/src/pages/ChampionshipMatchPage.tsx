import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Radio } from "lucide-react";
import { fetchVisibleChampionshipMatch } from "../api/championships";
import { fetchLeagueMatch } from "../api/leagues";
import { ChampError, TeamCrest } from "../components/championship/ChampShared";
import { Button } from "../components/ui";
import {
  formatChampWhen,
  formatMatchStamp,
  MATCH_STATUS_LABEL,
  STAGE_LABEL,
  venueOf,
} from "../lib/championshipUi";
import type { Match, MatchEvent } from "../types/match";
import { computeMatchClock } from "../lib/matchClock";

function playerLabel(
  player: MatchEvent["player"] | MatchEvent["playerIn"],
): string {
  if (!player) return "";
  return `${player.firstName} ${player.lastName}`.trim();
}

function eventIcon(type: MatchEvent["type"]): string {
  switch (type) {
    case "GOAL":
    case "OWN_GOAL":
      return "⚽";
    case "YELLOW_CARD":
      return "🟨";
    case "RED_CARD":
      return "🟥";
    case "SUBSTITUTION":
      return "🔄";
    default:
      return "📝";
  }
}

function eventDetail(event: MatchEvent): string {
  if (event.type === "SUBSTITUTION") {
    const outName = playerLabel(event.playerOut) || "—";
    const inName = playerLabel(event.playerIn) || "—";
    return `${outName} → ${inName}`;
  }
  if (event.type === "NOTE") {
    return event.note || "Qeyd";
  }
  const who = playerLabel(event.player) || "—";
  if (event.type === "OWN_GOAL") return `${who} (avtoqol)`;
  if (event.assistPlayer) {
    return `${who} · asist: ${playerLabel(event.assistPlayer)}`;
  }
  return who;
}

function EventRow({
  event,
  side,
}: {
  event: MatchEvent;
  side: "home" | "away";
}) {
  const icon = eventIcon(event.type);
  const minute = `${event.minute}'`;
  const detail = eventDetail(event);
  const isHome = side === "home";

  return (
    <li
      className={`flex items-start gap-2 text-sm text-gray-700 ${
        isHome ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <span className="mt-0.5 shrink-0 text-base leading-none">{icon}</span>
      <span className="shrink-0 font-semibold tabular-nums text-gray-500">
        {minute}
      </span>
      <span className="min-w-0 leading-snug">{detail}</span>
    </li>
  );
}

export default function ChampionshipMatchPage() {
  const { championshipId, leagueId, matchId: matchIdParam } = useParams();
  const matchId = Number(matchIdParam);
  const isLeague = Boolean(leagueId);
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async (silent = false) => {
    if (!Number.isInteger(matchId) || matchId <= 0) {
      setError("Yanlış oyun");
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = isLeague
        ? await fetchLeagueMatch(matchId)
        : await fetchVisibleChampionshipMatch(matchId);
      setMatch(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isLeague
            ? "Liqa məlumatlarını yükləmək mümkün olmadı."
            : "Çempionat məlumatlarını yükləmək mümkün olmadı.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isLeague, matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (match?.status !== "LIVE") return;
    const timer = window.setInterval(() => {
      void load(true);
    }, 12_000);
    return () => window.clearInterval(timer);
  }, [load, match?.status]);

  useEffect(() => {
    if (match?.status !== "LIVE") {
      return;
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [match?.status]);

  const clock = useMemo(
    () => (match ? computeMatchClock(match, nowMs) : null),
    [match, nowMs],
  );

  const bg =
    "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]";
  const backTo = isLeague
    ? `/leagues/${leagueId}?tab=matches`
    : `/sports/football/championships/${championshipId}?tab=matches`;
  const backLabel = isLeague ? "Liqaya qayıt" : "Çempionata qayıt";

  if (loading) {
    return (
      <p className={`min-h-screen pt-24 text-center text-gray-400 ${bg}`}>
        Yüklənir...
      </p>
    );
  }

  if (error || !match) {
    return (
      <div className={`min-h-screen pt-24 ${bg}`}>
        <div className="mx-auto max-w-3xl px-4">
          <ChampError
            message={
              error?.includes("do not have access") || error?.includes("giriş")
                ? isLeague
                  ? "Bu private liqaya yalnız iştirakçılar baxa bilər"
                  : "Bu private çempionata yalnız iştirakçılar baxa bilər"
                : error || undefined
            }
            onRetry={() => void load()}
          />
          <div className="mt-4 text-center">
            <Button onClick={() => navigate(backTo)}>Geri</Button>
          </div>
        </div>
      </div>
    );
  }

  const scheduled =
    match.status === "SCHEDULED" || match.status === "POSTPONED";
  const events = [...(match.events ?? [])].sort((a, b) => a.minute - b.minute);
  const homeEvents = events.filter((event) => event.teamId === match.homeTeamId);
  const awayEvents = events.filter((event) => event.teamId === match.awayTeamId);
  const unassignedEvents = events.filter(
    (event) =>
      event.teamId !== match.homeTeamId && event.teamId !== match.awayTeamId,
  );
  const hasEvents = events.length > 0;

  return (
    <div className={`min-h-screen overflow-x-hidden pt-24 pb-20 ${bg}`}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link
          to={backTo}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600"
        >
          <ArrowLeft size={15} />
          {backLabel}
        </Link>

        <div className="rounded-3xl border border-gray-200 bg-white/85 p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {match.stage ? (
                <span className="rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                  {STAGE_LABEL[match.stage]}
                </span>
              ) : match.round ? (
                <span className="rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                  {match.round}-ci tur
                </span>
              ) : null}
              <span>
                {isLeague
                  ? formatMatchStamp(match.scheduledAt)
                  : formatChampWhen(match.scheduledAt)}
              </span>
            </div>
            {match.status === "LIVE" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
                <Radio size={12} className="animate-pulse" />
                LIVE {clock ? clock.label : ""}
              </span>
            ) : (
              <span className="rounded-md bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-500">
                {MATCH_STATUS_LABEL[match.status]}
              </span>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamCrest
                name={match.homeTeam.name}
                logo={match.homeTeam.logo}
                size="lg"
              />
              <p className="font-semibold text-gray-900">{match.homeTeam.name}</p>
            </div>
            <div className="text-center">
              {scheduled ? (
                <p className="font-display text-3xl font-black tracking-wide text-gray-300">
                  VS
                </p>
              ) : (
                <p className="font-display text-4xl font-black tabular-nums text-gray-900">
                  {match.homeScore} - {match.awayScore}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <TeamCrest
                name={match.awayTeam.name}
                logo={match.awayTeam.logo}
                size="lg"
              />
              <p className="font-semibold text-gray-900">{match.awayTeam.name}</p>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-gray-400">
            <MapPin size={14} />
            {venueOf(match)}
          </p>

          {hasEvents ? (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="mb-3 text-center text-sm font-bold text-gray-800">
                Hadisələr
              </h3>
              <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8">
                <ul className="space-y-2.5 border-r border-gray-100 pr-3 sm:pr-5">
                  {homeEvents.length > 0 ? (
                    homeEvents.map((event) => (
                      <EventRow key={event.id} event={event} side="home" />
                    ))
                  ) : (
                    <li className="text-right text-xs text-gray-300">—</li>
                  )}
                </ul>
                <ul className="space-y-2.5 pl-3 sm:pl-5">
                  {awayEvents.length > 0 ? (
                    awayEvents.map((event) => (
                      <EventRow key={event.id} event={event} side="away" />
                    ))
                  ) : (
                    <li className="text-left text-xs text-gray-300">—</li>
                  )}
                </ul>
              </div>
              {unassignedEvents.length > 0 ? (
                <ul className="mt-4 space-y-1.5 border-t border-gray-50 pt-3 text-center">
                  {unassignedEvents.map((event) => (
                    <li key={event.id} className="text-sm text-gray-500">
                      {eventIcon(event.type)} {event.minute}' {eventDetail(event)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-gray-400">
              Hələ hadisə yoxdur.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
