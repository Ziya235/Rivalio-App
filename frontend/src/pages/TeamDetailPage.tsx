import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { MapPin, Users, UserPlus, Trophy } from "lucide-react";
import { Button, Input } from "../components/ui";
import {
  fetchTeam,
  invitePlayerToTeam,
  removeTeamPlayer,
  type TeamDetail,
} from "../api/teams";
import { useAuth } from "../context/AuthContext";
import type { AppOutletContext } from "../App";

export default function TeamDetailPage() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams<{ teamId: string }>();
  const teamId = Number(teamIdParam);
  const { user } = useAuth();
  const { isDarkMode } = useOutletContext<AppOutletContext>();
  const light = !isDarkMode;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
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
        message: message.trim() || undefined,
      });
      setUsername("");
      setMessage("");
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
      <div className={`min-h-screen pt-24 text-center ${light ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]" : "bg-[#08080e]"}`}>
        <p className={`mb-4 ${light ? "text-gray-500" : "text-white/50"}`}>Daxil olun</p>
        <Button onClick={() => navigate("/login")}>Giriş</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <p className={`min-h-screen pt-24 text-center ${light ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)] text-gray-400" : "bg-[#08080e] text-white/40"}`}>
        Yüklənir...
      </p>
    );
  }

  if (error || !team) {
    return (
      <div className={`min-h-screen pt-24 text-center ${light ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]" : "bg-[#08080e]"}`}>
        <p className="text-rose-400 mb-4">{error || "Tapılmadı"}</p>
        <Button onClick={() => navigate("/teams")} variant="outline">
          Geri
        </Button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-24 pb-20 ${light ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]" : "bg-[#08080e]"}`}>
      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        <div className="flex items-start gap-4 mb-8">
          {team.logo ? (
            <img
              src={team.logo}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover"
            />
          ) : (
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${light ? "bg-emerald-500/15 text-emerald-600" : "bg-[#c5f135]/15 text-[#c5f135]"}`}>
              {team.name.slice(0, 1)}
            </div>
          )}
          <div className="flex-1">
            <h1 className={`font-display text-4xl font-bold ${light ? "text-gray-900" : "text-white"}`}>
              {team.name}
            </h1>
            <div className={`flex flex-wrap gap-3 text-sm mt-2 ${light ? "text-gray-400" : "text-white/45"}`}>
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
          <p className={`mb-2 text-sm font-medium ${light ? "text-gray-500" : "text-white/60"}`}>
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
                className={`rounded-2xl border px-4 py-4 text-center ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}
              >
                <div
                  className={`font-display text-3xl font-bold ${
                    stat.accent ? (light ? "text-emerald-600" : "text-[#c5f135]") : (light ? "text-gray-900" : "text-white")
                  }`}
                >
                  {stat.value}
                </div>
                <div className={`mt-1 text-xs ${light ? "text-gray-400" : "text-white/40"}`}>{stat.label}</div>
              </div>
            ))}
          </div>
          <p className={`mt-2 text-xs ${light ? "text-gray-400" : "text-white/30"}`}>
            Public və private liqalardakı bitmiş oyunlar
          </p>
        </div>

        {team.leagueMemberships.length > 0 ? (
          <div className={`mb-8 rounded-2xl border p-4 ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}>
            <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${light ? "text-gray-600" : "text-white/70"}`}>
              <Trophy size={14} className={light ? "text-emerald-500" : "text-[#c5f135]"} />
              Liqalar
            </h2>
            <div className="flex flex-wrap gap-2">
              {team.leagueMemberships.map((m) => (
                <button
                  key={m.league.id}
                  type="button"
                  onClick={() => navigate(`/leagues/${m.league.id}`)}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${light ? "border-gray-200 text-gray-700 hover:border-emerald-500/40" : "border-white/10 text-white/80 hover:border-[#c5f135]/40"}`}
                >
                  {m.league.name}
                  <span className={`ml-2 text-xs ${light ? "text-gray-400" : "text-white/35"}`}>
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
            className={`mb-8 rounded-2xl border p-4 space-y-3 ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}
          >
            <h2 className={`text-sm font-semibold flex items-center gap-2 ${light ? "text-gray-900" : "text-white"}`}>
              <UserPlus size={14} />
              Oyunçuya komanda dəvəti göndər
            </h2>
            <Input
              label="Username"
              placeholder="oyunçu_username"
              value={username}
              onChange={setUsername}
              light={light}
            />
            <Input
              label="Dəvət mesajı"
              placeholder="Komandamıza qoşulmaq istəyirsən?"
              value={message}
              onChange={setMessage}
              light={light}
            />
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

        <div className={`rounded-2xl border overflow-hidden ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}>
          <div className={`px-4 py-3 border-b ${light ? "border-gray-200" : "border-white/10"}`}>
            <h2 className={`font-semibold ${light ? "text-gray-900" : "text-white"}`}>Heyət</h2>
          </div>
          <ul className={`divide-y ${light ? "divide-gray-100" : "divide-white/5"}`}>
            {team.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className={`font-medium ${light ? "text-gray-900" : "text-white"}`}>
                    <Link
                      to={`/players/${p.id}`}
                      className={light ? "hover:text-emerald-600" : "hover:text-[#c5f135]"}
                    >
                    {p.firstName} {p.lastName}
                    </Link>
                    {p.userId === team.captainId ? (
                      <span className={`ml-2 text-[10px]  tracking-wide ${light ? "text-emerald-600" : "text-[#c5f135]"}`}>
                        Kapitan
                      </span>
                    ) : null}
                  </p>
                  <p className={`text-xs ${light ? "text-gray-400" : "text-white/40"}`}>
                    {p.user?.username ? `@${p.user.username}` : "—"}
                    {/* {p.position ? ` · ${p.position}` : ""} */}
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
