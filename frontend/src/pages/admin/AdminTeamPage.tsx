import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { AdminPageShell } from "../../components/admin/AdminLayout";
import { fetchTeam } from "../../api/leagues";
import { mediaUrl } from "../../api/base";
import type { TeamDetail, TeamPlayer } from "../../types/league";

function PlayerAvatar({ player }: { player: TeamPlayer }) {
  const name = `${player.firstName} ${player.lastName}`.trim();
  if (player.photo) {
    return (
      <img
        src={mediaUrl(player.photo)}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AdminTeamPage() {
  const { leagueId: leagueIdParam, teamId: teamIdParam } = useParams();
  const leagueId = Number(leagueIdParam);
  const teamId = Number(teamIdParam);

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      setError("Yanlış liqa");
      setLoading(false);
      return;
    }
    if (!Number.isInteger(teamId) || teamId <= 0) {
      setError("Yanlış komanda");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeam(leagueId, teamId);
      setTeam(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Komanda yüklənmədi");
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [leagueId, teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>
    );
  }

  if (error || !team) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-rose-600">
          {error || "Komanda tapılmadı"}
        </p>
        <Link
          to={`/admin/football/leagues/${leagueId}`}
          className="text-sm font-semibold text-brand"
        >
          ← Liqaya qayıt
        </Link>
      </div>
    );
  }

  return (
    <AdminPageShell
      title={team.name}
      subtitle={`${team.league.name}${
        team.city ? ` · ${team.city}` : ""
      } · Oyunçu heyəti`}
    >
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link to="/admin/football/leagues" className="hover:text-brand">
          Liqalar
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          to={`/admin/football/leagues/${leagueId}`}
          className="hover:text-brand"
        >
          {team.league.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">{team.name}</span>
      </nav>

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {team.logo ? (
          <img
            src={mediaUrl(team.logo)}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand">
            {team.name.slice(0, 1)}
          </span>
        )}
        <div>
          <p className="text-lg font-bold text-ink">{team.name}</p>
          <p className="text-sm text-slate-500">
            {team.players.length} oyunçu
            {team.shortName ? ` · ${team.shortName}` : ""}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Users className="h-4 w-4 text-brand" />
          <h2 className="text-base font-bold text-ink">Oyunçular</h2>
        </div>
        {team.players.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Hələ oyunçu yoxdur.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Oyunçu</th>
                  <th className="px-4 py-3 text-center">Qol</th>
                  <th className="px-4 py-3 text-center">Asist</th>
                </tr>
              </thead>
              <tbody>
                {team.players.map((player) => (
                  <tr key={player.id} className="border-b border-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar player={player} />
                        <span className="font-semibold text-ink">
                          {player.firstName} {player.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-ink">
                      {player.goals ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-ink">
                      {player.assists ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
