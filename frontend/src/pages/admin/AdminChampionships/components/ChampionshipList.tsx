import { Link } from "react-router-dom";
import { Calendar, ChevronRight } from "lucide-react";
import {
  championshipPhase,
  championshipStatusLabel,
  competitionPhaseBadgeClass,
  visibilityBadgeClass,
  visibilityLabel,
} from "../../../../lib/competitionStatus";
import type {
  Championship,
  ChampionshipFormat,
  ChampionshipMatchFormat,
} from "../../../../types/championship";

const FORMAT_LABEL: Record<ChampionshipFormat, string> = {
  GROUP_AND_PLAYOFF: "Qrup + Playoff",
  PLAYOFF_ONLY: "Yalnız Playoff",
};

const MATCH_FORMAT_LABEL: Record<ChampionshipMatchFormat, string> = {
  SINGLE: "1 oyun",
  HOME_AWAY: "Ev-səfər",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function ChampionshipList({ rows }: { rows: Championship[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {rows.map((championship) => (
          <li key={championship.id}>
            <Link
              to={`/admin/football/championships/${championship.id}`}
              className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-extrabold text-ink">
                    {championship.name}
                  </p>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${competitionPhaseBadgeClass(
                      championshipPhase(championship.status),
                      true,
                    )}`}
                  >
                    {championshipStatusLabel(championship.status)}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${visibilityBadgeClass(
                      championship.visibility,
                      true,
                    )}`}
                  >
                    {visibilityLabel(championship.visibility)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                   {FORMAT_LABEL[championship.format]} ·{" "}
                  {MATCH_FORMAT_LABEL[championship.matchFormat ?? "SINGLE"]} ·{" "}
                  {championship.teamCount} komanda
                  
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(championship.startDate)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
