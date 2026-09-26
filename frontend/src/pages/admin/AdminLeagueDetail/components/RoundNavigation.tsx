import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROUND_STATUS_LABEL } from "../constants";
import type { LeagueRoundGroup } from "../helpers";

function chipClass(round: LeagueRoundGroup, selected: boolean): string {
  if (selected) return "border-ink bg-ink text-white shadow-sm";
  if (round.status === "completed") {
    return "border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
  }
  if (round.status === "current") {
    return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100";
  }
  return "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

export function RoundNavigation({
  rounds,
  activeKey,
  onSelect,
}: {
  rounds: LeagueRoundGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeIndex = Math.max(
    0,
    rounds.findIndex((round) => round.key === activeKey),
  );
  const completedCount = rounds.filter((round) => round.status === "completed").length;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const item = itemRefs.current[activeKey];
    if (!scroller || !item) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const delta =
      itemRect.left - scrollerRect.left - (scrollerRect.width - itemRect.width) / 2;
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeKey]);

  const selectByOffset = (offset: number) => {
    const next = rounds[activeIndex + offset];
    if (next) onSelect(next.key);
  };

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        aria-label="Əvvəlki tur"
        disabled={activeIndex <= 0}
        onClick={() => selectByOffset(-1)}
        className="inline-flex h-[4.25rem] w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div ref={scrollerRef} className="min-w-0 flex-1 overflow-x-auto pb-0.5">
        <div className="inline-flex min-w-full flex-col">
          <div className="flex gap-2">
            {rounds.map((round) => {
              const selected = round.key === activeKey;
              return (
                <button
                  key={round.key}
                  type="button"
                  ref={(node) => {
                    itemRefs.current[round.key] = node;
                  }}
                  onClick={() => onSelect(round.key)}
                  title={ROUND_STATUS_LABEL[round.status]}
                  className={`flex h-[4.25rem] w-16 shrink-0 flex-col items-center justify-center rounded-xl border transition ${chipClass(round, selected)}`}
                >
                  <span className="text-[10px] font-semibold tracking-wide opacity-70">TUR</span>
                  <span className="text-lg font-bold leading-none tabular-nums">
                    {round.round ?? "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{
                width: `${rounds.length === 0 ? 0 : (completedCount / rounds.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-label="Növbəti tur"
        disabled={activeIndex >= rounds.length - 1}
        onClick={() => selectByOffset(1)}
        className="inline-flex h-[4.25rem] w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
