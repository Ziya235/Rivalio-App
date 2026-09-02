import { Link } from "react-router-dom";
import { playerFullName } from "../../lib/championshipUi";
import type { PlayerStatistics } from "../../types/championship";
import { ChampEmpty, TeamCrest } from "./ChampShared";

const MEDALS = ["🥇", "🥈", "🥉"];

export function TopScorers({ rows }: { rows: PlayerStatistics[] }) {
  const ranked = [...rows]
    .filter((row) => row.goals > 0 || row.assists > 0)
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        b.assists - a.assists ||
        playerFullName(a).localeCompare(playerFullName(b), "az"),
    );

  if (ranked.length === 0) {
    return (
      <ChampEmpty
        title="Hələ bombardir yoxdur"
        hint="Qollar qeydə alındıqca burada sıralama görünəcək."
      />
    );
  }

  const leader = ranked[0];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Top scorer
        </p>
        <div className="mt-3 flex items-center gap-3">
          {leader.photo ? (
            <img
              src={leader.photo}
              alt=""
              className="h-14 w-14 rounded-full object-cover ring-2 ring-emerald-200"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
              {playerFullName(leader).slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-display text-xl font-bold text-gray-900">
              {playerFullName(leader)}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <TeamCrest name={leader.team.name} logo={leader.team.logo} size="sm" />
              {leader.team.name}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-display text-3xl font-black text-emerald-600">
              {leader.goals}
            </p>
            <p className="text-xs text-gray-400">qol</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Player</th>
                <th className="px-3 py-2.5">Team</th>
                <th className="px-2 py-2.5 text-center">Goals</th>
                <th className="px-2 py-2.5 text-center">Assists</th>
                <th className="px-2 py-2.5 text-center">Matches</th>
                <th className="px-3 py-2.5 text-center">G/M</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-50 ${index < 3 ? "bg-amber-50/40" : "hover:bg-gray-50/70"}`}
                >
                  <td className="px-3 py-2.5 text-center font-bold">
                    {index < 3 ? (
                      <span className="text-base">{MEDALS[index]}</span>
                    ) : (
                      <span className="text-gray-400">{index + 1}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/players/${row.id}`}
                      className="flex items-center gap-2.5 hover:text-emerald-600"
                    >
                      {row.photo ? (
                        <img
                          src={row.photo}
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
                  <td className="px-2 py-2.5 text-center font-black tabular-nums text-gray-900">
                    {row.goals}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                    {row.assists}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                    {row.matchesPlayed}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-gray-500">
                    {row.goalsPerMatch.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
