import type { StandingRow } from "../../../../types/championship";
import { formatDiff } from "../helpers";
import { TeamMark } from "./TeamMark";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">
        Cədvəl hələ boşdur.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="w-12 px-3 py-2.5 pr-1 text-center">#</th>
            <th className="px-2 py-2.5 pl-1">Komanda</th>
            <th className="px-2 py-2.5 text-center">O</th>
            <th className="px-2 py-2.5 text-center">Q</th>
            <th className="px-2 py-2.5 text-center">He</th>
            <th className="px-2 py-2.5 text-center">M</th>
            <th className="px-2 py-2.5 text-center">Qol</th>
            <th className="px-2 py-2.5 text-center">+</th>
            <th className="px-4 py-2.5 text-center">Xal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row) => (
            <tr key={row.teamId} className="hover:bg-slate-50/60">
              <td className="w-12 px-3 py-2.5 pr-1 text-center font-bold tabular-nums text-slate-500">
                {row.rank}
              </td>
              <td className="px-2 py-2.5 pl-1">
                <TeamMark
                  name={row.team.name}
                  logo={row.team.logo}
                  size="sm"
                />
              </td>
              <td className="px-2 py-2.5 text-center tabular-nums">{row.played}</td>
              <td className="px-2 py-2.5 text-center tabular-nums">{row.won}</td>
              <td className="px-2 py-2.5 text-center tabular-nums">{row.drawn}</td>
              <td className="px-2 py-2.5 text-center tabular-nums">{row.lost}</td>
              <td className="px-2 py-2.5 text-center tabular-nums">
                {row.goalsFor}:{row.goalsAgainst}
              </td>
              <td className="px-2 py-2.5 text-center tabular-nums">
                {formatDiff(row.goalDiff)}
              </td>
              <td className="px-4 py-2.5 text-center font-bold tabular-nums text-ink">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
