import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Radio } from "lucide-react";
import { fetchVisibleChampionshipMatch } from "../api/championships";
import { ChampError, TeamCrest } from "../components/championship/ChampShared";
import { Button } from "../components/ui";
import {
  formatChampWhen,
  MATCH_STATUS_LABEL,
  STAGE_LABEL,
  venueOf,
} from "../lib/championshipUi";
import type { Match, MatchEvent } from "../types/match";

function eventLine(event: MatchEvent): string {
  const who = event.player
    ? `${event.player.firstName} ${event.player.lastName}`
    : "";
  switch (event.type) {
    case "GOAL":
      return `⚽ ${event.minute}' ${who}`;
    case "OWN_GOAL":
      return `⚽ ${event.minute}' ${who} (avtoqol)`;
    case "YELLOW_CARD":
      return `🟨 ${event.minute}' ${who}`;
    case "RED_CARD":
      return `🟥 ${event.minute}' ${who}`;
    case "SUBSTITUTION":
      return `🔄 ${event.minute}' ${event.playerOut ? `${event.playerOut.firstName} ${event.playerOut.lastName}` : ""} → ${event.playerIn ? `${event.playerIn.firstName} ${event.playerIn.lastName}` : ""}`;
    default:
      return event.note || "Qeyd";
  }
}

export default function ChampionshipMatchPage() {
  const { championshipId, matchId: matchIdParam } = useParams();
  const matchId = Number(matchIdParam);
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const data = await fetchVisibleChampionshipMatch(matchId);
      setMatch(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Çempionat məlumatlarını yükləmək mümkün olmadı.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, [matchId]);

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

  const bg =
    "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]";
  const backTo = `/sports/football/championships/${championshipId}?tab=matches`;

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
          <ChampError message={error || undefined} onRetry={() => void load()} />
          <div className="mt-4 text-center">
            <Button onClick={() => navigate(backTo)}>Geri</Button>
          </div>
        </div>
      </div>
    );
  }

  const scheduled =
    match.status === "SCHEDULED" || match.status === "POSTPONED";

  return (
    <div className={`min-h-screen overflow-x-hidden pt-24 pb-20 ${bg}`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link
          to={backTo}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600"
        >
          <ArrowLeft size={15} />
          Çempionata qayıt
        </Link>

        <div className="rounded-3xl border border-gray-200 bg-white/85 p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {match.stage ? (
                <span className="rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                  {STAGE_LABEL[match.stage]}
                </span>
              ) : null}
              <span>{formatChampWhen(match.scheduledAt)}</span>
            </div>
            {match.status === "LIVE" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
                <Radio size={12} className="animate-pulse" />
                LIVE {match.minute != null ? `${match.minute}'` : ""}
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

          {(match.events ?? []).length > 0 ? (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="mb-3 text-sm font-bold text-gray-800">Hadisələr</h3>
              <ul className="space-y-1.5">
                {(match.events ?? []).map((event) => (
                  <li key={event.id} className="text-sm text-gray-600">
                    {eventLine(event)}
                  </li>
                ))}
              </ul>
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
