import type { GroupStandingsBlock } from "../../types/championship";
import { ChampEmpty, TeamCrest } from "./ChampShared";

export function ChampionshipGroups({
  standings,
  myTeamIds,
}: {
  standings: GroupStandingsBlock[];
  myTeamIds: Set<number>;
}) {
  if (standings.length === 0) {
    return (
      <ChampEmpty
        title="Qruplar hələ yoxdur"
        hint="Bu çempionat qrup mərhələsi olmadan keçirilir və ya qruplar hələ yaradılmayıb."
      />
    );
  }

  return (
    <div className="space-y-5">
      {standings.map((block) => {
        const qualify = block.qualifyCount ?? 0;
        return (
          <section
            key={block.groupId}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white/80 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <h3 className="font-display text-base font-bold text-gray-900">
                {block.groupName}
              </h3>
              {qualify > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  🟢 İlk {qualify} komanda playoff-a yüksəlir
                </span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-3 py-2.5 text-center">#</th>
                    <th className="px-3 py-2.5">Team</th>
                    <th className="px-2 py-2.5 text-center">O</th>
                    <th className="px-2 py-2.5 text-center">W</th>
                    <th className="px-2 py-2.5 text-center">D</th>
                    <th className="px-2 py-2.5 text-center">L</th>
                    <th className="px-2 py-2.5 text-center">GF</th>
                    <th className="px-2 py-2.5 text-center">GA</th>
                    <th className="px-2 py-2.5 text-center">GD</th>
                    <th className="px-3 py-2.5 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {block.standings.map((row) => {
                    const qualifies = qualify > 0 && row.rank <= qualify;
                    const mine = myTeamIds.has(row.teamId);
                    return (
                      <tr
                        key={row.teamId}
                        className={`border-b border-gray-50 ${
                          mine
                            ? "bg-emerald-50/80"
                            : qualifies
                              ? "bg-emerald-50/30"
                              : "hover:bg-gray-50/70"
                        }`}
                      >
                        <td
                          className={`px-3 py-2.5 text-center font-bold tabular-nums ${
                            qualifies ? "text-emerald-600" : "text-gray-400"
                          }`}
                        >
                          {row.rank}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <TeamCrest
                              name={row.team.name}
                              logo={row.team.logo}
                              size="sm"
                            />
                            <span className="font-semibold text-gray-900">
                              {row.team.name}
                            </span>
                            {mine ? (
                              <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                Sizin
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                          {row.played}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                          {row.won}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                          {row.drawn}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                          {row.lost}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                          {row.goalsFor}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                          {row.goalsAgainst}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-gray-600">
                          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                        </td>
                        <td className="px-3 py-2.5 text-center font-black tabular-nums text-gray-900">
                          {row.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
