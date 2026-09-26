import { Link } from "react-router-dom";
import {
  competitionPhaseBadgeClass,
  leaguePhase,
  leagueStatusLabel,
  visibilityBadgeClass,
  visibilityLabel,
} from "../../../../lib/competitionStatus";
import type { League } from "../../../../types/league";
import { formatDate } from "../helpers";
import { LeagueAvatar } from "./LeagueAvatar";

export function LeagueTable({ leagues }: { leagues: League[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Liqanın adı</th>
            <th className="px-4 py-3">Komandalar</th>
            <th className="px-4 py-3">Yaradılıb</th>
            <th className="px-4 py-3">Liqa növü</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {leagues.map((league) => (
            <tr
              key={league.id}
              className="border-b border-slate-50 transition hover:bg-slate-50/80"
            >
              <td className="px-4 py-3">
                <Link
                  to={`/admin/football/leagues/${league.id}`}
                  className="flex items-center gap-3"
                >
                  <LeagueAvatar league={league} />
                  <span className="truncate font-semibold text-ink">{league.name}</span>
                </Link>
              </td>
              <td className="px-4 py-3 font-medium text-slate-700">{league._count.teams}</td>
              <td className="px-4 py-3 text-slate-500">{formatDate(league.createdAt)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${visibilityBadgeClass(league.visibility, true)}`}
                >
                  {visibilityLabel(league.visibility)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${competitionPhaseBadgeClass(leaguePhase(league.status), true)}`}
                >
                  {leagueStatusLabel(league.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
