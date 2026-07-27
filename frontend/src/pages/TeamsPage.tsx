import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Plus, Users } from "lucide-react";
import { Button, Input, Card } from "../components/ui";
import { fetchTeams, type TeamSummary } from "../api/teams";
import { useAuth } from "../context/AuthContext";

export default function TeamsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeams({ q: search.trim() || undefined });
      setTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [user, search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="bg-[#08080e] min-h-screen pt-24 pb-20">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-6xl font-bold text-white mb-2">
              Komandalar
            </h1>
            <p className="text-white/45">
              Komanda yarat, oyunçu əlavə et, liqaya qoşul
            </p>
          </div>
          <Button onClick={() => navigate("/teams/create")} size="md">
            <Plus size={16} />
            Komanda yarat
          </Button>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-white/10 bg-[#101017] p-8 text-center">
            <p className="text-white/60 mb-4">
              Komandaları görmək üçün daxil olun
            </p>
            <Button onClick={() => navigate("/login")}>Giriş</Button>
          </div>
        ) : (
          <>
            <div className="bg-[#101017] card-border rounded-2xl p-4 mb-8">
              <Input
                placeholder="Komanda adı axtar..."
                value={search}
                onChange={setSearch}
                icon={<Search size={14} />}
              />
            </div>

            {loading ? (
              <p className="text-center text-white/40 py-16">Yüklənir...</p>
            ) : error ? (
              <p className="text-center text-rose-400 py-16">{error}</p>
            ) : teams.length === 0 ? (
              <p className="text-center text-white/40 py-16">
                Komanda tapılmadı
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className="cursor-pointer hover:border-[#c5f135]/30 transition-colors"
                    onClick={() => navigate(`/teams/${team.id}`)}
                  >
                    <div className="flex items-start gap-3 p-1">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#c5f135]/15 text-[#c5f135] flex items-center justify-center font-bold">
                          {team.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {team.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-white/45 mt-1">
                          {team.city ? (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />
                              {team.city}
                            </span>
                          ) : null}
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {team._count?.players ?? 0}
                          </span>
                        </div>
                        {team.captain ? (
                          <p className="text-xs text-white/35 mt-1">
                            Kapitan: @{team.captain.username}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
