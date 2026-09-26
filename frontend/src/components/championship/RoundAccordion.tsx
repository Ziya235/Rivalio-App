import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { ChampionshipRound } from "../../lib/championshipRounds";

export function RoundAccordion({
  rounds,
  openKey,
  renderRound,
}: {
  rounds: ChampionshipRound[];
  openKey: string | null;
  renderRound: (round: ChampionshipRound) => ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(openKey);

  useEffect(() => {
    setOpen(openKey);
  }, [openKey]);

  if (rounds.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
        Oyun yoxdur.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rounds.map((round) => {
        const expanded = open === round.key;
        return (
          <section key={round.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : round.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-ink">{round.label}</span>
                {round.status === "current" ? (
                  <span className="text-[11px] font-bold text-sky-700">Cari tur</span>
                ) : null}
              </span>
              <span className="text-xs font-semibold text-slate-400">{round.matches.length} oyun</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded ? <div className="border-t border-slate-100">{renderRound(round)}</div> : null}
          </section>
        );
      })}
    </div>
  );
}
