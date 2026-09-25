import { useState } from "react";
import { Radio } from "lucide-react";
import type { Match } from "../../../../types/match";
import { MatchListSection } from "./MatchListSection";

export type GroupMatchTab = "live" | "upcoming" | "finished";

export function GroupMatchesTabs({
  liveMatches,
  upcomingMatches,
  finishedMatches,
  onSelect,
  onEnter,
}: {
  liveMatches: Match[];
  upcomingMatches: Match[];
  finishedMatches: Match[];
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
}) {
  const [tab, setTab] = useState<GroupMatchTab>("live");

  const tabs: {
    id: GroupMatchTab;
    label: string;
    count: number;
    matches: Match[];
  }[] = [
    {
      id: "live",
      label: "Canlı",
      count: liveMatches.length,
      matches: liveMatches,
    },
    {
      id: "upcoming",
      label: "Növbəti oyunlar",
      count: upcomingMatches.length,
      matches: upcomingMatches,
    },
    {
      id: "finished",
      label: "Bitmiş",
      count: finishedMatches.length,
      matches: finishedMatches,
    },
  ];

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-2 pt-2 sm:px-3">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-brand text-ink shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.id === "live" ? (
                  <Radio
                    className={`h-3.5 w-3.5 ${
                      liveMatches.length > 0
                        ? isActive
                          ? "animate-pulse text-rose-600"
                          : "text-rose-500"
                        : "text-slate-400"
                    }`}
                  />
                ) : null}
                <span>{t.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                    isActive ? "bg-white/60 text-ink" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-h-[min(420px,55vh)] overflow-y-auto">
        <MatchListSection
          title={active.label}
          matches={active.matches}
          onSelect={onSelect}
          onEnter={onEnter}
          hideHeader
          compact
        />
      </div>
    </section>
  );
}
