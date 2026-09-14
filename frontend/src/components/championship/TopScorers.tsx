import { Link } from "react-router-dom";
import { playerFullName } from "../../lib/championshipUi";
import type { PlayerStatistics } from "../../types/championship";
import { mediaUrl } from "../../api/base";
import { ChampEmpty, TeamCrest } from "./ChampShared";

function PlayerStatTable({
  title,
  rows,
  value,
  empty,
}: {
  title: string;
  rows: PlayerStatistics[];
  value: "goals" | "assists";
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/80 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-bold text-gray-900">{title}</p>
        </div>
        <ChampEmpty title={empty} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/80 shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-bold text-gray-900">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-3 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5">Oyunçu</th>
              <th className="px-3 py-2.5">Komanda</th>
              <th className="px-3 py-2.5 text-center">
                {value === "goals" ? "Qol" : "Asist"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${value}-${row.id}`}
                className="border-b border-gray-50 hover:bg-gray-50/70"
              >
                <td className="px-3 py-2.5 text-center font-bold tabular-nums text-gray-400">
                  {index + 1}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    to={`/players/${row.id}`}
                    className="flex items-center gap-2.5 hover:text-emerald-600"
                  >
                    {row.photo ? (
                      <img
                        src={mediaUrl(row.photo)}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                        {playerFullName(row).slice(0, 1)}
                      </span>
                    )}
                    <span>
                      <span className="block font-semibold text-gray-900">
                        {playerFullName(row)}
                      </span>
                      {row.shirtNumber != null ? (
                        <span className="text-xs text-gray-400">
                          #{row.shirtNumber}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2 text-gray-600">
                    <TeamCrest
                      name={row.team.name}
                      logo={row.team.logo}
                      size="sm"
                    />
                    {row.team.name}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center font-black tabular-nums text-gray-900">
                  {value === "goals" ? row.goals : row.assists}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TopScorers({ rows }: { rows: PlayerStatistics[] }) {
  const goalRows = [...rows]
    .filter((row) => row.goals > 0)
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        b.assists - a.assists ||
        playerFullName(a).localeCompare(playerFullName(b), "az"),
    );
  const assistRows = [...rows]
    .filter((row) => row.assists > 0)
    .sort(
      (a, b) =>
        b.assists - a.assists ||
        b.goals - a.goals ||
        playerFullName(a).localeCompare(playerFullName(b), "az"),
    );

  return (
    <div className="space-y-4">
      <PlayerStatTable
        title="Top Goal"
        rows={goalRows}
        value="goals"
        empty="Hələ qol yoxdur."
      />
      <PlayerStatTable
        title="Top Asist"
        rows={assistRows}
        value="assists"
        empty="Hələ asist yoxdur."
      />
    </div>
  );
}
