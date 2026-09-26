import { Link } from "react-router-dom";
import { Trash2, Trophy, Users } from "lucide-react";
import type { League } from "../../../../types/league";
import type { StandingRow } from "../../../../types/league";
import { formatDiff } from "../helpers";
import { TeamMark } from "./TeamMark";

export function LeagueStandings({
  leagueId,
  leagueStatus,
  standings,
  deletingId,
  onRemove,
}: {
  leagueId: number;
  leagueStatus: League["status"];
  standings: StandingRow[];
  deletingId: number | null;
  onRemove: (team: { teamId: number; name: string }) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Trophy className="h-4 w-4 text-brand" />
        <h2 className="text-base font-bold text-ink">Turnir cədvəli</h2>
      </div>
      {standings.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">
          Hələ komanda yoxdur. Mövcud komandanı dəvət edin.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 text-center">#</th>
                <th className="px-3 py-3">Komanda</th>
                <th className="px-2 py-3 text-center" title="Oyun sayı">
                  O
                </th>
                <th className="px-2 py-3 text-center" title="Qələbə">
                  Q
                </th>
                <th className="px-2 py-3 text-center" title="Heç-heçə">
                  He
                </th>
                <th className="px-2 py-3 text-center" title="Məğlubiyyət">
                  M
                </th>
                <th className="px-2 py-3 text-center" title="Vurulan : buraxılan qollar">
                  Qol
                </th>
                <th className="px-2 py-3 text-center" title="Qol fərqi">
                  +
                </th>
                <th className="px-2 py-3 text-center" title="Xal">
                  Xal
                </th>
                <th className="px-3 py-3 text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => (
                <tr
                  key={row.teamId}
                  className="border-b border-slate-50 hover:bg-slate-50/80"
                >
                  <td className="px-3 py-3 text-center font-medium tabular-nums text-slate-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      to={`/admin/football/leagues/${leagueId}/teams/${row.teamId}`}
                      className="group block"
                    >
                      <TeamMark name={row.teamName} logo={row.logo} size="sm" />
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-slate-600">
                    {row.played}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-slate-600">
                    {row.wins}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-slate-600">
                    {row.draws}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-slate-600">
                    {row.losses}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-slate-700">
                    {row.goalsFor}:{row.goalsAgainst}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-slate-600">
                    {formatDiff(row.goalDifference)}
                  </td>
                  <td className="px-2 py-3 text-center font-bold tabular-nums text-ink">
                    {row.points}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/admin/football/leagues/${leagueId}/teams/${row.teamId}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Oyunçular
                      </Link>
                      {leagueStatus === "DRAFT" ? (
                        <button
                          type="button"
                          disabled={deletingId === row.teamId}
                          onClick={() =>
                            onRemove({ teamId: row.teamId, name: row.teamName })
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          title="Liqadan çıxar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
