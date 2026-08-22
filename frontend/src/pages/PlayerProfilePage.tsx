import { useEffect, useState } from "react";
import { Link, Navigate, useOutletContext, useParams } from "react-router-dom";
import { Briefcase, Calendar, MapPin, Trophy } from "lucide-react";
import { Badge } from "../components/ui";
import { fetchPlayerProfile, type PlayerProfile } from "../api/players";
import { useAuth } from "../context/AuthContext";
import type { AppOutletContext } from "../App";

function calculateAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export default function PlayerProfilePage() {
  const { playerId: playerIdParam } = useParams<{ playerId: string }>();
  const playerId = Number(playerIdParam);
  const { user, isLoading: authLoading } = useAuth();
  const { isDarkMode } = useOutletContext<AppOutletContext>();
  const light = !isDarkMode;
  const bg = light ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]" : "bg-[#08080e]";
  const card = light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]";
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !Number.isInteger(playerId) || playerId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetchPlayerProfile(playerId)
      .then(setPlayer)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Oyunçu profili yüklənmədi"),
      )
      .finally(() => setLoading(false));
  }, [playerId, user]);

  if (authLoading) {
    return (
      <div className={`min-h-screen pt-24 text-center ${bg} ${light ? "text-gray-400" : "text-white/40"}`}>
        Yüklənir...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className={`min-h-screen pt-24 text-center ${bg} ${light ? "text-gray-400" : "text-white/40"}`}>
        Yüklənir...
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className={`min-h-screen pt-24 text-center text-rose-400 ${bg}`}>
        {error || "Oyunçu tapılmadı"}
      </div>
    );
  }

  const fullName = `${player.firstName} ${player.lastName}`.trim();
  const age = calculateAge(player.dateOfBirth);

  return (
    <div className={`min-h-screen pb-20 pt-24 ${bg}`}>
      <div className="mx-auto max-w-[900px] px-4 sm:px-6">
        <div className={`mb-6 overflow-hidden rounded-3xl border ${card}`}>
          <div className={`h-32 ${light ? "bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-blue-500/10" : "bg-gradient-to-r from-[#c5f135]/10 via-[#7c3aed]/10 to-[#3b82f6]/10"}`} />
          <div className="-mt-10 px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {player.image ? (
                <img
                  src={player.image}
                  alt={fullName}
                  className={`h-20 w-20 rounded-2xl border-4 object-cover ${light ? "border-white" : "border-[#101017]"}`}
                />
              ) : (
                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border-4 text-2xl font-bold ${light ? "border-white bg-emerald-500/15 text-emerald-600" : "border-[#101017] bg-[#c5f135]/15 text-[#c5f135]"}`}>
                  {fullName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="pb-1">
                <h1 className={`font-display text-4xl font-bold ${light ? "text-gray-900" : "text-white"}`}>
                  {fullName}
                </h1>
                <div className={`mt-1 flex flex-wrap items-center gap-3 text-sm ${light ? "text-gray-400" : "text-white/45"}`}>
                  {player.username ? <span>@{player.username}</span> : null}
                  {player.position ? <span>{player.position}</span> : null}
                  {age !== null ? (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {age} yaş
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {player.description ? (
              <p className={`mt-5 max-w-2xl text-sm leading-relaxed ${light ? "text-gray-500" : "text-white/55"}`}>
                {player.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className={`mb-6 rounded-2xl border p-5 ${card}`}>
          <h2 className={`mb-3 text-sm font-semibold ${light ? "text-gray-600" : "text-white/70"}`}>
            Bütün liqalar üzrə statistika
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Oyun", value: player.stats.gamesPlayed },
              { label: "Qol", value: player.stats.goals, accent: true },
              { label: "Asist", value: player.stats.assists },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-xl p-4 text-center ${light ? "bg-gray-50" : "bg-[#0a0a11]"}`}>
                <div
                  className={`font-display text-3xl font-bold ${
                    stat.accent ? (light ? "text-emerald-600" : "text-[#c5f135]") : (light ? "text-gray-900" : "text-white")
                  }`}
                >
                  {stat.value}
                </div>
                <div className={`text-xs ${light ? "text-gray-400" : "text-white/40"}`}>{stat.label}</div>
              </div>
            ))}
          </div>
          <p className={`mt-2 text-xs ${light ? "text-gray-400" : "text-white/30"}`}>
            Public və private liqalardakı bitmiş oyunlar
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h2 className={`mb-4 font-semibold ${light ? "text-gray-900" : "text-white"}`}>Komandalar</h2>
            <div className="space-y-3">
              {player.teams.map((team) => (
                <Link
                  key={team.playerId}
                  to={`/teams/${team.id}`}
                  className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-white/5"}`}
                >
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt=""
                      className="h-11 w-11 rounded-xl object-cover"
                    />
                  ) : (
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${light ? "bg-emerald-500/10 text-emerald-600" : "bg-white/5 text-[#c5f135]"}`}>
                      {team.name.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <p className={`font-medium ${light ? "text-gray-900" : "text-white"}`}>{team.name}</p>
                    <p className={`flex items-center gap-1 text-xs ${light ? "text-gray-400" : "text-white/40"}`}>
                      {team.city ? <MapPin size={11} /> : null}
                      {team.city || team.position || "Aktiv oyunçu"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-5 ${card}`}>
            <h2 className={`mb-4 flex items-center gap-2 font-semibold ${light ? "text-gray-900" : "text-white"}`}>
              <Trophy size={15} className={light ? "text-emerald-500" : "text-[#c5f135]"} />
              Liqalar
            </h2>
            <div className="space-y-3">
              {player.leagues.length > 0 ? (
                player.leagues.map((league) => (
                  <Link
                    key={league.id}
                    to={`/leagues/${league.id}`}
                    className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${light ? "hover:bg-gray-100" : "hover:bg-white/5"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-medium ${light ? "text-gray-900" : "text-white"}`}>{league.name}</p>
                      <p className={`text-xs ${light ? "text-gray-400" : "text-white/40"}`}>{league.season || "—"}</p>
                    </div>
                    <Badge
                      variant={league.visibility === "PUBLIC" ? "public" : "private"}
                    >
                      {league.visibility === "PUBLIC" ? "Public" : "Private"}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className={`text-sm ${light ? "text-gray-400" : "text-white/35"}`}>Liqa yoxdur</p>
              )}
            </div>
          </div>
        </div>

        {player.workplace || player.school ? (
          <div className={`mt-6 rounded-2xl border p-5 ${card}`}>
            <h2 className={`mb-3 font-semibold ${light ? "text-gray-900" : "text-white"}`}>Məlumatlar</h2>
            <div className={`space-y-2 text-sm ${light ? "text-gray-500" : "text-white/55"}`}>
              {player.workplace ? (
                <p className="flex items-center gap-2">
                  <Briefcase size={14} />
                  {player.workplace}
                </p>
              ) : null}
              {player.school ? <p>Təhsil: {player.school}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
