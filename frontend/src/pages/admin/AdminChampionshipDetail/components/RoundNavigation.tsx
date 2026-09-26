import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChampionshipRound } from "../../../../lib/championshipRounds";

export function RoundNavigation({
  rounds,
  activeRound,
  currentRound,
  onSelect,
}: {
  rounds: ChampionshipRound[];
  activeRound: number | null;
  currentRound: ChampionshipRound | null;
  onSelect: (round: number) => void;
}) {
  const index = rounds.findIndex((round) => round.round === activeRound);
  const active = index >= 0 ? rounds[index] : null;
  const isCurrent = currentRound != null && active?.round === currentRound.round;
  const canReturn =
    currentRound != null &&
    !isCurrent &&
    rounds.some((round) => round.round === currentRound.round);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Əvvəlki tur"
          disabled={index <= 0}
          onClick={() => {
            const previous = rounds[index - 1];
            if (previous) onSelect(previous.round);
          }}
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Əvvəlki</span>
        </button>
        <div
          className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-3 py-2 ${
            isCurrent ? "bg-ink text-white" : "bg-slate-50 text-ink"
          }`}
        >
          <span className="truncate text-sm font-extrabold">{active?.label ?? "Tur yoxdur"}</span>
          {isCurrent ? (
            <span className="text-[11px] font-semibold text-white/70">Cari tur</span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Növbəti tur"
          disabled={index < 0 || index >= rounds.length - 1}
          onClick={() => {
            const next = rounds[index + 1];
            if (next) onSelect(next.round);
          }}
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="hidden sm:inline">Növbəti</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {canReturn && currentRound ? (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => onSelect(currentRound.round)}
            className="text-xs font-semibold text-sky-700 hover:underline"
          >
            Cari tura qayıt
          </button>
        </div>
      ) : null}
    </div>
  );
}
