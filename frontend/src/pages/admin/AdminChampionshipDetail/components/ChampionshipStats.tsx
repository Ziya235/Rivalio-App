import { type ReactNode } from "react";
import { CircleDot, Handshake } from "lucide-react";
import { mediaUrl } from "../../../../api/base";
import type { ChampScorerRow } from "../constants";
import { playerDisplayName } from "../helpers";

export function ChampionshipStatsBlock({
  players,
}: {
  players: ChampScorerRow[];
}) {
  const goalRows = [...players]
    .filter((row) => row.goals > 0)
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        b.assists - a.assists ||
        playerDisplayName(a).localeCompare(playerDisplayName(b), "az"),
    );
  const assistRows = [...players]
    .filter((row) => row.assists > 0)
    .sort(
      (a, b) =>
        b.assists - a.assists ||
        b.goals - a.goals ||
        playerDisplayName(a).localeCompare(playerDisplayName(b), "az"),
    );

  return (
    <div className="space-y-4">
      <ChampionshipPlayerStatTable
        title="Ən çox qol"
        icon={<CircleDot className="h-4 w-4 text-emerald-600" />}
        rows={goalRows}
        value="goals"
        empty="Hələ qol yoxdur."
      />
      <ChampionshipPlayerStatTable
        title="Ən çox asist"
        icon={<Handshake className="h-4 w-4 text-sky-600" />}
        rows={assistRows}
        value="assists"
        empty="Hələ asist yoxdur."
      />
    </div>
  );
}

export function ChampionshipPlayerStatTable({
  title,
  icon,
  rows,
  value,
  empty,
}: {
  title: string;
  icon: ReactNode;
  rows: ChampScorerRow[];
  value: "goals" | "assists";
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        {icon}
        <h3 className="text-sm font-bold text-ink">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Oyunçu</th>
                <th className="px-3 py-2.5">Komanda</th>
                <th className="px-3 py-2.5 text-center">
                  {value === "goals" ? "Qol" : "Asist"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2.5 text-center font-bold tabular-nums text-slate-400">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {row.photo ? (
                        <img
                          src={mediaUrl(row.photo)}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {playerDisplayName(row).slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span>
                        <span className="block font-semibold text-ink">
                          {playerDisplayName(row)}
                        </span>
                        {row.shirtNumber != null ? (
                          <span className="text-xs text-slate-400">
                            #{row.shirtNumber}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {row.teamLogo ? (
                        <img
                          src={mediaUrl(row.teamLogo)}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : null}
                      <span className="truncate text-slate-600">
                        {row.teamName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-base font-black tabular-nums text-ink">
                    {value === "goals" ? row.goals : row.assists}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
