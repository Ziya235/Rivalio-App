import type { StandingRow } from "../../../../types/championship";
import { formatDiff } from "../helpers";
import { TeamMark } from "./TeamMark";

export type FormMark = "Q" | "H" | "M";

const FORM_CLASS: Record<FormMark, string> = {
  Q: "bg-emerald-100 text-emerald-700",
  H: "bg-slate-100 text-slate-500",
  M: "bg-rose-100 text-rose-600",
};

export function StandingsTable({
  rows,
  formByTeam = {},
  qualifyCount = 2,
}: {
  rows: StandingRow[];
  formByTeam?: Record<number, FormMark[]>;
  qualifyCount?: number;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">Cədvəl hələ boşdur.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <th className="w-10 px-3 py-2.5 text-center">#</th>
            <th className="px-2 py-2.5">Komanda</th>
            <th className="px-2 py-2.5 text-center">O</th>
            <th className="px-2 py-2.5 text-center">Q</th>
            <th className="px-2 py-2.5 text-center">H</th>
            <th className="px-2 py-2.5 text-center">M</th>
            <th className="px-2 py-2.5 text-center">Qol</th>
            <th className="px-2 py-2.5 text-center">+/-</th>
            <th className="px-3 py-2.5 text-center">Xal</th>
            <th className="px-2 py-2.5 text-center">Forma</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const qualifies = row.rank <= qualifyCount;
            const diff = row.goalDiff;
            const form = formByTeam[row.teamId] ?? [];
            return (
              <tr key={row.teamId} className="border-b border-slate-50 last:border-0">
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${
                      qualifies ? "bg-lime-300 text-ink" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <TeamMark name={row.team.name} logo={row.team.logo} size="sm" />
                </td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-600">{row.played}</td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-600">{row.won}</td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-600">{row.drawn}</td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-600">{row.lost}</td>
                <td className="px-2 py-3 text-center tabular-nums text-slate-700">
                  {row.goalsFor}:{row.goalsAgainst}
                </td>
                <td
                  className={`px-2 py-3 text-center text-xs font-bold tabular-nums ${
                    diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-500" : "text-slate-400"
                  }`}
                >
                  {formatDiff(diff)}
                </td>
                <td className="px-3 py-3 text-center text-base font-black tabular-nums text-ink">
                  {row.points}
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {Array.from({ length: 5 }, (_, index) => {
                      const mark = form[index - (5 - form.length)];
                      if (!mark) {
                        return (
                          <span
                            key={`${row.teamId}-empty-${index}`}
                            className="inline-flex h-5 w-5 rounded-md bg-slate-100"
                          />
                        );
                      }
                      return (
                        <span
                          key={`${row.teamId}-${index}`}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${FORM_CLASS[mark]}`}
                        >
                          {mark}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
