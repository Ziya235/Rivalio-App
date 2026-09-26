import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { parsePlayoffNotes } from "../../../../lib/playoffBracket";
import type { Championship, MatchStage } from "../../../../types/championship";
import type { Match } from "../../../../types/match";
import { PLAYOFF_STAGES, STAGE_LABEL, type PlayoffPlaceholder } from "../constants";
import { playoffPlaceholders } from "../helpers";
import { useLiveClock } from "../hooks/useLiveClock";
import { FixtureRow } from "./FixtureRow";

function championName(matches: Match[]): string | null {
  const final = [...matches]
    .reverse()
    .find((match) => match.stage === "FINAL" && match.status === "FINISHED");
  if (!final) return null;
  if (final.winnerTeam?.name) return final.winnerTeam.name;
  if (final.homeScore > final.awayScore) return final.homeTeam.name;
  if (final.awayScore > final.homeScore) return final.awayTeam.name;
  return null;
}

export function PlayoffStage({
  championship,
  matches,
  currentStage,
  allowSchedule,
  onSelect,
  onEnter,
}: {
  championship: Pick<Championship, "teams" | "startDate" | "groups">;
  matches: Match[];
  currentStage: MatchStage | null;
  allowSchedule: boolean;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  const playoffMatches = useMemo(
    () => matches.filter((match) => match.stage && match.stage !== "GROUP_STAGE"),
    [matches],
  );

  const playoffByStage = useMemo(() => {
    const map = new Map<MatchStage, Match[]>();
    for (const stage of PLAYOFF_STAGES) map.set(stage, []);
    for (const match of playoffMatches) {
      const stage = match.stage as MatchStage;
      if (!map.has(stage)) continue;
      map.get(stage)!.push(match);
    }
    for (const rows of map.values()) {
      rows.sort((left, right) => (left.round ?? 0) - (right.round ?? 0) || left.id - right.id);
    }
    return map;
  }, [playoffMatches]);

  const placeholderMap = useMemo(() => playoffPlaceholders(playoffMatches), [playoffMatches]);
  const visibleStages = PLAYOFF_STAGES.filter(
    (stage) =>
      (playoffByStage.get(stage)?.length ?? 0) > 0 || (placeholderMap.get(stage)?.length ?? 0) > 0,
  );

  const fallback =
    currentStage && visibleStages.includes(currentStage)
      ? currentStage
      : (visibleStages.at(-1) ?? null);
  const [picked, setPicked] = useState<MatchStage | null>(null);
  const active = picked && visibleStages.includes(picked) ? picked : fallback;
  const activeIndex = active ? visibleStages.indexOf(active) : -1;
  const tabRefs = useRef<Partial<Record<MatchStage, HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (!active) return;
    tabRefs.current[active]?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  const stageMatches = active ? (playoffByStage.get(active) ?? []) : [];
  const placeholders: PlayoffPlaceholder[] = active ? (placeholderMap.get(active) ?? []) : [];
  const hasLive = stageMatches.some((match) => match.status === "LIVE");
  const nowMs = useLiveClock(hasLive);
  const champion = championName(playoffMatches);

  const seeds = useMemo(() => {
    const map = new Map<number, { seed: number; name: string; detail: string }>();
    for (const match of playoffMatches) {
      const meta = parsePlayoffNotes(match.notes);
      const sides = [
        { team: match.homeTeam, seed: meta?.homeSeed, detail: meta?.homeLabel },
        { team: match.awayTeam, seed: meta?.awaySeed, detail: meta?.awayLabel },
      ];
      for (const side of sides) {
        if (side.seed == null || map.has(side.team.id)) continue;
        map.set(side.team.id, {
          seed: side.seed,
          name: side.team.name,
          detail: side.detail ?? "",
        });
      }
    }
    return [...map.values()].sort((left, right) => left.seed - right.seed);
  }, [playoffMatches]);
  const qualifyCount = championship.groups[0]?.qualifyCount || 2;

  if (playoffMatches.length === 0 && visibleStages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">Playoff hələ başlamayıb.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Əvvəlki mərhələ"
          disabled={activeIndex <= 0}
          onClick={() => setPicked(visibleStages[activeIndex - 1] ?? null)}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {visibleStages.map((stage) => {
            const selected = stage === active;
            const isCurrent = stage === currentStage;
            return (
              <button
                key={stage}
                type="button"
                ref={(node) => {
                  tabRefs.current[stage] = node;
                }}
                onClick={() => setPicked(stage)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  selected
                    ? "bg-ink text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {STAGE_LABEL[stage]}
                {isCurrent && !selected ? (
                  <span className="ml-1.5 text-[10px] font-bold uppercase text-sky-600">Cari</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Növbəti mərhələ"
          disabled={activeIndex < 0 || activeIndex >= visibleStages.length - 1}
          onClick={() => setPicked(visibleStages[activeIndex + 1] ?? null)}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {active === "FINAL" && champion ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <Trophy className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">Çempion</p>
            <p className="text-base font-extrabold">{champion}</p>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pley-off</p>
          <h2 className="text-lg font-extrabold text-ink">
            {active ? STAGE_LABEL[active] : "Pley-off"}
          </h2>
        </div>
        {stageMatches.length === 0 && placeholders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Bu mərhələdə oyun yoxdur.</p>
        ) : (
          <>
            {stageMatches.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {stageMatches.map((match) => (
                  <li key={match.id}>
                    <FixtureRow
                      match={match}
                      nowMs={nowMs}
                      onSelect={onSelect}
                      onEnter={onEnter}
                      allowSchedule={allowSchedule}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
            {placeholders.length > 0 ? (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {placeholders.map((item) => (
                  <li key={item.key} className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Gözlənilir
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {item.homeLabel}
                      <span className="mx-2 text-slate-300">— : —</span>
                      {item.awayLabel}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </section>

      {seeds.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-ink">Püşk yerləri (#)</h3>
            {championship.groups.length > 0 ? (
              <p className="text-[11px] text-slate-400">
                Qrup nəticələrinə görə · #{qualifyCount === 1 ? "1" : `1 və #${qualifyCount}`}{" "}
                növbəti mərhələyə keçir
              </p>
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {seeds.map((seed) => (
              <div
                key={seed.seed}
                className="flex w-40 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-black text-ink">#{seed.seed}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-ink">{seed.name}</span>
                  {seed.detail ? (
                    <span className="block truncate text-[10px] text-slate-400">{seed.detail}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
