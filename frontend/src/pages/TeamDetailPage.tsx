import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin, Users, UserPlus, Trophy } from "lucide-react";
import { Button, Input } from "../components/ui";
import {
  fetchTeam,
  invitePlayerToTeam,
  removeTeamPlayer,
  type TeamDetail,
} from "../api/teams";
import { useAuth } from "../context/AuthContext";

export default function TeamDetailPage() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams<{ teamId: string }>();
  const teamId = Number(teamIdParam);
  const { user } = useAuth();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [position, setPosition] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(teamId) || teamId <= 0) {
      setError("Yanlış komanda");
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeam(teamId);
      setTeam(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [teamId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const isCaptain = user && team && team.captainId === user.id;

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setFormError("Username yazın");
      return;
    }
    setAdding(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await invitePlayerToTeam(teamId, {
        username: username.trim().toLowerCase(),
        position: position.trim() || undefined,
      });
      setUsername("");
      setPosition("");
      setFormSuccess("Oyunçuya komanda dəvəti göndərildi");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Dəvət göndərilmədi");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (playerId: number, name: string) => {
    if (!window.confirm(`${name} silinsin?`)) return;
    try {
      await removeTeamPlayer(teamId, playerId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinmədi");
    }
  };

  if (!user) {
    return (
      <div className="bg-[#08080e] min-h-screen pt-24 text-center">
        <p className="text-white/50 mb-4">Daxil olun</p>
        <Button onClick={() => navigate("/login")}>Giriş</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="bg-[#08080e] min-h-screen pt-24 text-center text-white/40">
        Yüklənir...
      </p>
    );
  }

  if (error || !team) {
    return (
      <div className="bg-[#08080e] min-h-screen pt-24 text-center">
        <p className="text-rose-400 mb-4">{error || "Tapılmadı"}</p>
        <Button onClick={() => navigate("/teams")} variant="outline">
          Geri
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-24 pb-20">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        <div className="flex items-start gap-4 mb-8">
          {team.logo ? (
            <img
              src={team.logo}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#c5f135]/15 text-[#c5f135] flex items-center justify-center text-2xl font-bold">
              {team.name.slice(0, 1)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-display text-4xl font-bold text-white">
              {team.name}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-white/45 mt-2">
              {team.city ? (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {team.city}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Users size={12} />
                {team.players.length} oyunçu
              </span>
              {team.captain ? (
                <span>Kapitan: @{team.captain.username}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-white/60">
            Bütün liqalar üzrə statistika
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Oyun", value: team.leagueStats.matchesPlayed },
              { label: "Qol", value: team.leagueStats.goals, accent: true },
              { label: "Asist", value: team.leagueStats.assists },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-[#101017] px-4 py-4 text-center"
              >
                <div
                  className={`font-display text-3xl font-bold ${
                    stat.accent ? "text-[#c5f135]" : "text-white"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/30">
            Public və private liqalardakı bitmiş oyunlar
          </p>
        </div>

        {team.leagueMemberships.length > 0 ? (
          <div className="mb-8 rounded-2xl border border-white/10 bg-[#101017] p-4">
            <h2 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <Trophy size={14} className="text-[#c5f135]" />
              Liqalar
            </h2>
            <div className="flex flex-wrap gap-2">
              {team.leagueMemberships.map((m) => (
                <button
                  key={m.league.id}
                  type="button"
                  onClick={() => navigate(`/leagues/${m.league.id}`)}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:border-[#c5f135]/40"
                >
                  {m.league.name}
                  <span className="text-white/35 ml-2 text-xs">
                    {m.league.visibility}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isCaptain ? (
          <form
            onSubmit={(e) => void handleAdd(e)}
            className="mb-8 rounded-2xl border border-white/10 bg-[#101017] p-4 space-y-3"
          >
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserPlus size={14} />
              Oyunçuya komanda dəvəti göndər
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Username"
                placeholder="oyunçu_username"
                value={username}
                onChange={setUsername}
              />
              <Input
                label="Pozisiya"
                placeholder="Hücumçu"
                value={position}
                onChange={setPosition}
              />
            </div>
            {formError ? (
              <p className="text-sm text-rose-400">{formError}</p>
            ) : null}
            {formSuccess ? (
              <p className="text-sm text-emerald-400">{formSuccess}</p>
            ) : null}
            <Button type="submit" disabled={adding} size="sm">
              {adding ? "Göndərilir..." : "Dəvət göndər"}
            </Button>
          </form>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-[#101017] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-semibold text-white">Heyət</h2>
          </div>
          <ul className="divide-y divide-white/5">
            {team.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">
                    <Link
                      to={`/players/${p.id}`}
                      className="hover:text-[#c5f135]"
                    >
                    {p.firstName} {p.lastName}
                    </Link>
                    {p.userId === team.captainId ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-[#c5f135]">
                        Kapitan
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-white/40">
                    {p.user?.username ? `@${p.user.username}` : "—"}
                    {p.position ? ` · ${p.position}` : ""}
                  </p>
                </div>
                {isCaptain && p.userId !== team.captainId ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleRemove(
                        p.id,
                        `${p.firstName} ${p.lastName}`,
                      )
                    }
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Sil
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
