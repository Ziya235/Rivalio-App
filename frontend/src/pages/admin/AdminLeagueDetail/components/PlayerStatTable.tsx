import { mediaUrl } from "../../../../api/base";
import type { LeaguePlayerRow } from "../../../../types/league";
import { playerName } from "../helpers";

export function PlayerStatTable({
  rows,
  empty,
  columns,
}: {
  rows: LeaguePlayerRow[];
  empty: string;
  columns: "goals" | "assists" | "ga";
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 text-center">#</th>
                <th className="px-3 py-3">Oyunçu</th>
                <th className="px-3 py-3">Komanda</th>
                <th className="px-2 py-3 text-center">O</th>
                {columns === "goals" || columns === "ga" ? (
                  <th className="px-2 py-3 text-center">Qol</th>
                ) : null}
                {columns === "assists" || columns === "ga" ? (
                  <th className="px-2 py-3 text-center">Asist</th>
                ) : null}
                {columns === "ga" ? (
                  <th className="px-2 py-3 text-center">Cəmi</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                  <td className="px-3 py-3 text-center font-medium text-slate-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      {row.photo ? (
                        <img
                          src={mediaUrl(row.photo)}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {playerName(row).slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span>
                        <span className="block font-semibold text-ink">{playerName(row)}</span>
                        {row.shirtNumber != null ? (
                          <span className="text-xs text-slate-400">#{row.shirtNumber}</span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{row.team.name}</td>
                  <td className="px-2 py-3 text-center text-slate-600">{row.matchesPlayed}</td>
                  {columns === "goals" || columns === "ga" ? (
                    <td className="px-2 py-3 text-center font-bold text-ink">{row.goals}</td>
                  ) : null}
                  {columns === "assists" || columns === "ga" ? (
                    <td className="px-2 py-3 text-center font-bold text-ink">{row.assists}</td>
                  ) : null}
                  {columns === "ga" ? (
                    <td className="px-2 py-3 text-center font-extrabold text-ink">
                      {row.goals + row.assists}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
