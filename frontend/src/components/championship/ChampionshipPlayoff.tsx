import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { PLAYOFF_STAGES, STAGE_LABEL, playoffPlaceholders } from "../../lib/championshipUi";
import { parsePlayoffNotes } from "../../lib/playoffBracket";
import type { MatchStage } from "../../types/championship";
import type { Match } from "../../types/match";
import { PublicMatchLine } from "./PublicMatchLine";
import { useLiveClock } from "./useLiveClock";

export function ChampionshipPlayoff({
  matches,
  currentStage,
  onOpenMatch,
}: {
  matches: Match[];
  currentStage: MatchStage | null;
  onOpenMatch: (match: Match) => void;
}) {
  const playoffMatches = useMemo(
    () => matches.filter((match) => match.stage && match.stage !== "GROUP_STAGE"),
    [matches],
  );
  const byStage = useMemo(() => {
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
  const placeholders = useMemo(() => playoffPlaceholders(playoffMatches), [playoffMatches]);
  const visible = PLAYOFF_STAGES.filter(
    (stage) => (byStage.get(stage)?.length ?? 0) > 0 || (placeholders.get(stage)?.length ?? 0) > 0,
  );
  const fallback = currentStage && visible.includes(currentStage) ? currentStage : (visible.at(-1) ?? null);
  const [picked, setPicked] = useState<MatchStage | null>(null);
  const active = picked && visible.includes(picked) ? picked : fallback;
  const activeIndex = active ? visible.indexOf(active) : -1;
  const tabRefs = useRef<Partial<Record<MatchStage, HTMLButtonElement | null>>>({});
  const stageMatches = active ? (byStage.get(active) ?? []) : [];
  const stagePlaceholders = active ? (placeholders.get(active) ?? []) : [];
  const nowMs = useLiveClock(stageMatches.some((match) => match.status === "LIVE"));

  useEffect(() => {
    if (!active) return;
    tabRefs.current[active]?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  const seeds = useMemo(() => {
    const map = new Map<number, { seed: number; name: string; detail: string }>();
    for (const match of playoffMatches) {
      const meta = parsePlayoffNotes(match.notes);
      for (const side of [
        { team: match.homeTeam, seed: meta?.homeSeed, detail: meta?.homeLabel },
        { team: match.awayTeam, seed: meta?.awaySeed, detail: meta?.awayLabel },
      ]) {
        if (side.seed == null || map.has(side.team.id)) continue;
        map.set(side.team.id, { seed: side.seed, name: side.team.name, detail: side.detail ?? "" });
      }
    }
    return [...map.values()].sort((left, right) => left.seed - right.seed);
  }, [playoffMatches]);

  if (playoffMatches.length === 0 && visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">Pley-off hələ başlamayıb.</p>
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
          onClick={() => setPicked(visible[activeIndex - 1] ?? null)}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {visible.map((stage) => {
            const selected = stage === active;
            return (
              <button
                key={stage}
                type="button"
                ref={(node) => {
                  tabRefs.current[stage] = node;
                }}
                onClick={() => setPicked(stage)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${
                  selected ? "bg-ink text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {STAGE_LABEL[stage]}
                {stage === currentStage && !selected ? (
                  <span className="ml-1.5 text-[10px] font-bold uppercase text-sky-600">Cari</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Növbəti mərhələ"
          disabled={activeIndex < 0 || activeIndex >= visible.length - 1}
          onClick={() => setPicked(visible[activeIndex + 1] ?? null)}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pley-off</p>
          <h2 className="text-lg font-extrabold text-ink">{active ? STAGE_LABEL[active] : "Pley-off"}</h2>
        </div>
        {stageMatches.length === 0 && stagePlaceholders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Bu mərhələdə oyun yoxdur.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {stageMatches.map((match) => (
                <li key={match.id}>
                  <PublicMatchLine match={match} nowMs={nowMs} onOpen={onOpenMatch} />
                </li>
              ))}
            </ul>
            {stagePlaceholders.length > 0 ? (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {stagePlaceholders.map((item) => (
                  <li key={item.key} className="px-4 py-3 text-sm font-semibold text-slate-600">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gözlənilir</p>
                    <p className="mt-1">
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
          <h3 className="mb-3 text-sm font-extrabold text-ink">Püşk yerləri (#)</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {seeds.map((seed) => (
              <div key={seed.seed} className="flex w-40 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm font-black text-ink">#{seed.seed}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-ink">{seed.name}</span>
                  {seed.detail ? <span className="block truncate text-[10px] text-slate-400">{seed.detail}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
