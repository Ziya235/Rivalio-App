import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Briefcase, Calendar, MapPin, Trophy } from "lucide-react";
import { Badge } from "../components/ui";
import { fetchPlayerProfile, type PlayerProfile } from "../api/players";
import { useAuth } from "../context/AuthContext";

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
      <div className="min-h-screen bg-[#08080e] pt-24 text-center text-white/40">
        Yüklənir...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080e] pt-24 text-center text-white/40">
        Yüklənir...
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-[#08080e] pt-24 text-center text-rose-400">
        {error || "Oyunçu tapılmadı"}
      </div>
    );
  }

  const fullName = `${player.firstName} ${player.lastName}`.trim();
  const age = calculateAge(player.dateOfBirth);

  return (
    <div className="min-h-screen bg-[#08080e] pb-20 pt-24">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6">
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#101017]">
          <div className="h-32 bg-gradient-to-r from-[#c5f135]/10 via-[#7c3aed]/10 to-[#3b82f6]/10" />
          <div className="-mt-10 px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {player.image ? (
                <img
                  src={player.image}
                  alt={fullName}
                  className="h-20 w-20 rounded-2xl border-4 border-[#101017] object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-[#101017] bg-[#c5f135]/15 text-2xl font-bold text-[#c5f135]">
                  {fullName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="pb-1">
                <h1 className="font-display text-4xl font-bold text-white">
                  {fullName}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/45">
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
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/55">
                {player.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-[#101017] p-5">
          <h2 className="mb-3 text-sm font-semibold text-white/70">
            Bütün liqalar üzrə statistika
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Oyun", value: player.stats.gamesPlayed },
              { label: "Qol", value: player.stats.goals, accent: true },
              { label: "Asist", value: player.stats.assists },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-[#0a0a11] p-4 text-center">
                <div
                  className={`font-display text-3xl font-bold ${
                    stat.accent ? "text-[#c5f135]" : "text-white"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/30">
            Public və private liqalardakı bitmiş oyunlar
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#101017] p-5">
            <h2 className="mb-4 font-semibold text-white">Komandalar</h2>
            <div className="space-y-3">
              {player.teams.map((team) => (
                <Link
                  key={team.playerId}
                  to={`/teams/${team.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5"
                >
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt=""
                      className="h-11 w-11 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 font-bold text-[#c5f135]">
                      {team.name.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <p className="font-medium text-white">{team.name}</p>
                    <p className="flex items-center gap-1 text-xs text-white/40">
                      {team.city ? <MapPin size={11} /> : null}
                      {team.city || team.position || "Aktiv oyunçu"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101017] p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
              <Trophy size={15} className="text-[#c5f135]" />
              Liqalar
            </h2>
            <div className="space-y-3">
              {player.leagues.length > 0 ? (
                player.leagues.map((league) => (
                  <Link
                    key={league.id}
                    to={`/leagues/${league.id}`}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{league.name}</p>
                      <p className="text-xs text-white/40">{league.season || "—"}</p>
                    </div>
                    <Badge
                      variant={league.visibility === "PUBLIC" ? "public" : "private"}
                    >
                      {league.visibility === "PUBLIC" ? "Public" : "Private"}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-white/35">Liqa yoxdur</p>
              )}
            </div>
          </div>
        </div>

        {player.workplace || player.school ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#101017] p-5">
            <h2 className="mb-3 font-semibold text-white">Məlumatlar</h2>
            <div className="space-y-2 text-sm text-white/55">
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
