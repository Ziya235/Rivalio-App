import { useEffect, useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import type { Match } from "../../../../types/match";
import { buildLeagueRounds, getCurrentRound } from "../helpers";
import { MatchList, RoundMatches } from "./RoundMatches";
import { RoundNavigation } from "./RoundNavigation";

type MatchView = "all" | "live" | "current";

export function LeagueMatches({
  leagueId,
  matches,
  onSelect,
  onEnter,
}: {
  leagueId: number;
  matches: Match[];
  teamCount: number;
  readOnly: boolean;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  const [matchView, setMatchView] = useState<MatchView>("current");
  const [pickedKey, setPickedKey] = useState<string | null>(null);

  useEffect(() => {
    setMatchView("current");
    setPickedKey(null);
  }, [leagueId]);

  const liveMatches = useMemo(
    () =>
      matches
        .filter((match) => match.status === "LIVE")
        .sort(
          (left, right) =>
            (left.round ?? Number.MAX_SAFE_INTEGER) -
              (right.round ?? Number.MAX_SAFE_INTEGER) || left.id - right.id,
        ),
    [matches],
  );
  const rounds = useMemo(() => buildLeagueRounds(matches), [matches]);
  const current = getCurrentRound(rounds);
  const active = rounds.find((round) => round.key === pickedKey) ?? current ?? null;
  const completedCount = rounds.filter((round) => round.status === "completed").length;

  const pillClass = (activePill: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
      activePill
        ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
    }`;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMatchView("all")}
              className={pillClass(matchView === "all")}
            >
              Bütün turlar
            </button>
            <button
              type="button"
              onClick={() => setMatchView("live")}
              className={pillClass(matchView === "live")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Canlı
              {liveMatches.length > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                  {liveMatches.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setMatchView("current")}
              className={pillClass(matchView === "current")}
            >
              <Crosshair className="h-3.5 w-3.5" />
              Cari tur
            </button>
          </div>
          {rounds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Tamamlanıb
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-sky-500" />
                Cari
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] border border-slate-300" />
                Qarşıdadır
              </span>
              <span className="text-slate-400">
                {completedCount} / {rounds.length} tur
              </span>
            </div>
          ) : null}
        </div>

        {matchView === "current" && rounds.length > 0 && active ? (
          <div className="mt-4">
            <RoundNavigation
              rounds={rounds}
              activeKey={active.key}
              onSelect={setPickedKey}
            />
          </div>
        ) : null}
      </section>

      {matchView === "live" ? (
        <MatchList
          matches={liveMatches}
          empty="Hazırda canlı oyun yoxdur."
          onSelect={onSelect}
          onEnter={onEnter}
        />
      ) : rounds.length === 0 || !active ? (
        <MatchList
          matches={[]}
          empty="Bu liqada hələ oyun yoxdur."
          onSelect={onSelect}
          onEnter={onEnter}
        />
      ) : matchView === "all" ? (
        <div className="space-y-4">
          {rounds.map((round) => (
            <RoundMatches
              key={round.key}
              round={round}
              onSelect={onSelect}
              onEnter={onEnter}
            />
          ))}
        </div>
      ) : (
        <RoundMatches round={active} onSelect={onSelect} onEnter={onEnter} />
      )}
    </div>
  );
}
