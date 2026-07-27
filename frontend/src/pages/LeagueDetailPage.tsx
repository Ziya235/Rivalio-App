import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock, Trophy, Users } from "lucide-react";
import { Badge, Button } from "../components/ui";
import {
  fetchLeagueStandings,
  fetchLeagues,
} from "../api/leagues";
import type { League, StandingRow } from "../types/league";
import { useAuth } from "../context/AuthContext";

export default function LeagueDetailPage() {
  const { leagueId: leagueIdParam } = useParams();
  const leagueId = Number(leagueIdParam);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      setError("Yanlış liqa");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [leagues, standingsRes] = await Promise.all([
        fetchLeagues(),
        fetchLeagueStandings(leagueId),
      ]);
      const found = leagues.find((l) => l.id === leagueId) || null;
      if (!found) {
        setError("Liqa tapılmadı və ya giriş yoxdur");
        setLeague(null);
        setStandings([]);
      } else {
        setLeague(found);
        setStandings(standingsRes.standings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="bg-[#08080e] min-h-screen pt-24 text-center text-white/40">
        Yüklənir...
      </p>
    );
  }

  if (error || !league) {
    return (
      <div className="bg-[#08080e] min-h-screen pt-24 text-center">
        <p className="text-rose-400 mb-4">{error || "Tapılmadı"}</p>
        <Button onClick={() => navigate("/sports/football")} variant="outline">
          Geri
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-24 pb-20">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-display text-4xl font-bold text-white">
              {league.name}
            </h1>
            <Badge
              variant={league.visibility === "PUBLIC" ? "public" : "private"}
            >
              {league.visibility === "PUBLIC" ? (
                "Public"
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Lock size={10} /> Private
                </span>
              )}
            </Badge>
          </div>
          <p className="text-white/45 text-sm">
            {league.season || "Mövsüm yoxdur"}
            {league.description ? ` · ${league.description}` : ""}
          </p>
          {league.visibility === "PUBLIC" && user ? (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => navigate("/sports/football")}
            >
              <Users size={14} />
              Qoşulmaq üçün Futbol səhifəsinə keç
            </Button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#101017] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            <Trophy size={16} className="text-[#c5f135]" />
            <h2 className="font-semibold text-white">Turnir cədvəli</h2>
          </div>
          {standings.length === 0 ? (
            <p className="px-4 py-10 text-center text-white/40 text-sm">
              Hələ komanda yoxdur
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-xs text-white/40 uppercase">
                    <th className="px-3 py-3 text-center">#</th>
                    <th className="px-3 py-3 text-left">Komanda</th>
                    <th className="px-2 py-3 text-center">O</th>
                    <th className="px-2 py-3 text-center">Q</th>
                    <th className="px-2 py-3 text-center">H</th>
                    <th className="px-2 py-3 text-center">M</th>
                    <th className="px-2 py-3 text-center">TF</th>
                    <th className="px-2 py-3 text-center">X</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => (
                    <tr
                      key={row.teamId}
                      className="border-b border-white/5 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-3 text-center text-white/50">
                        {i + 1}
                      </td>
                      <td className="px-3 py-3 font-medium text-white">
                        {row.teamName}
                      </td>
                      <td className="px-2 py-3 text-center text-white/70">
                        {row.played}
                      </td>
                      <td className="px-2 py-3 text-center text-white/70">
                        {row.wins}
                      </td>
                      <td className="px-2 py-3 text-center text-white/70">
                        {row.draws}
                      </td>
                      <td className="px-2 py-3 text-center text-white/70">
                        {row.losses}
                      </td>
                      <td className="px-2 py-3 text-center text-white/70">
                        {row.goalDifference > 0
                          ? `+${row.goalDifference}`
                          : row.goalDifference}
                      </td>
                      <td className="px-2 py-3 text-center font-bold text-white">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
