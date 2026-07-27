import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  MapPin,
  Plus,
  Send,
  Swords,
  UserPlus,
  Users,
} from "lucide-react";
import { Button, Input, Tabs } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fetchTeams, type TeamSummary } from "../api/teams";
import { fetchLeagues } from "../api/leagues";
import { requestJoinLeague } from "../api/teams";
import {
  createChallenge,
  createFriendly,
  fetchChallenges,
  fetchPlayerSearches,
  requestChallenge,
  requestJoinPlayerSearch,
  respondChallengeRequest,
  respondPlayerSearchRequest,
  type Challenge,
  type PlayerSearch,
} from "../api/social";
import type { League } from "../types/league";

function toLocalInputValue(d = new Date(Date.now() + 3600_000)) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FootballPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Oyunçu axtarışı");
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [allTeams, setAllTeams] = useState<TeamSummary[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [searches, setSearches] = useState<PlayerSearch[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const captainTeams = useMemo(
    () => myTeams.filter((t) => t.captainId === user?.id),
    [myTeams, user?.id],
  );
  const primaryCaptainTeam = captainTeams[0] || null;

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [mine, all, ch, ps, lg] = await Promise.all([
        fetchTeams({ mine: true }),
        fetchTeams(),
        fetchChallenges(),
        fetchPlayerSearches(),
        fetchLeagues(),
      ]);
      setMyTeams(mine);
      setAllTeams(all);
      setChallenges(ch);
      setSearches(ps);
      setLeagues(lg.filter((l) => l.visibility === "PUBLIC"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Challenge form
  const [chVenue, setChVenue] = useState("");
  const [chWhen, setChWhen] = useState(toLocalInputValue());
  const [chNotes, setChNotes] = useState("");

  // Friendly form
  const [frHome, setFrHome] = useState("");
  const [frAway, setFrAway] = useState("");
  const [frVenue, setFrVenue] = useState("");
  const [frWhen, setFrWhen] = useState(toLocalInputValue());
  const [frNeeded, setFrNeeded] = useState("0");

  // Join league
  const [joinLeagueId, setJoinLeagueId] = useState("");
  const [joinTeamId, setJoinTeamId] = useState("");

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2500);
  };

  const onCreateChallenge = async (e: FormEvent) => {
    e.preventDefault();
    if (!primaryCaptainTeam) {
      flash("Əvvəlcə komanda yaradın (kapitan olmalısınız)");
      return;
    }
    setBusy(true);
    try {
      await createChallenge({
        teamId: primaryCaptainTeam.id,
        scheduledAt: new Date(chWhen).toISOString(),
        venue: chVenue.trim(),
        notes: chNotes.trim() || undefined,
      });
      setChVenue("");
      setChNotes("");
      flash("Challenge yaradıldı");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onCreateFriendly = async (e: FormEvent) => {
    e.preventDefault();
    const homeId = Number(frHome || primaryCaptainTeam?.id);
    const awayId = Number(frAway);
    if (!homeId || !awayId) {
      flash("Hər iki komandanı seçin");
      return;
    }
    setBusy(true);
    try {
      const needed = Number(frNeeded) || 0;
      await createFriendly({
        homeTeamId: homeId,
        awayTeamId: awayId,
        scheduledAt: new Date(frWhen).toISOString(),
        venue: frVenue.trim(),
        playersNeeded: needed > 0 ? needed : undefined,
      });
      flash("Yoldaşılıq oyunu yaradıldı");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onJoinLeague = async (e: FormEvent) => {
    e.preventDefault();
    const leagueId = Number(joinLeagueId);
    const teamId = Number(joinTeamId || primaryCaptainTeam?.id);
    if (!leagueId || !teamId) {
      flash("Liqa və komanda seçin");
      return;
    }
    setBusy(true);
    try {
      await requestJoinLeague(leagueId, { teamId });
      flash("Qoşulma sorğusu göndərildi");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-[#08080e] min-h-screen pt-24 text-center">
        <p className="text-white/50 mb-4">Futbol bölməsi üçün daxil olun</p>
        <Button onClick={() => navigate("/login")}>Giriş</Button>
      </div>
    );
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-24 pb-20">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-5xl font-bold text-white">Futbol</h1>
          <p className="text-white/45 mt-1">
            Oyunçu axtarışı, challenge və yoldaşılıq oyunları
          </p>
          {primaryCaptainTeam ? (
            <p className="text-xs text-[#c5f135]/80 mt-2">
              Kapitan komandanız: {primaryCaptainTeam.name}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/teams/create")}
              className="text-xs text-[#c5f135] mt-2 underline"
            >
              Kapitan olmaq üçün komanda yarat →
            </button>
          )}
        </div>

        {msg ? (
          <div className="mb-4 rounded-xl border border-[#c5f135]/30 bg-[#c5f135]/10 px-4 py-2 text-sm text-[#c5f135]">
            {msg}
          </div>
        ) : null}

        <Tabs
          tabs={[
            "Oyunçu axtarışı",
            "Challenges",
            "Yoldaşılıq yarat",
            "Liqaya qoşul",
          ]}
          active={tab}
          onChange={setTab}
        />

        {loading ? (
          <p className="text-white/40 text-center py-16">Yüklənir...</p>
        ) : error ? (
          <p className="text-rose-400 text-center py-16">{error}</p>
        ) : null}

        {!loading && !error && tab === "Oyunçu axtarışı" ? (
          <div className="mt-6 space-y-4">
            {searches.length === 0 ? (
              <p className="text-white/40 text-center py-10">
                Açıq oyunçu axtarışı yoxdur
              </p>
            ) : (
              searches.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/10 bg-[#101017] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white text-lg">
                        {s.hostTeam.name}
                        {s.opponentTeam
                          ? ` vs ${s.opponentTeam.name}`
                          : ""}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-xs text-white/45 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(s.scheduledAt).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {s.venue}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserPlus size={12} />
                          {s.spotsLeft} yer qalıb
                        </span>
                      </div>
                    </div>
                    {s.hostTeam.captainId === user.id ||
                    s.hostTeam.captain?.username === user.username ? (
                      <div className="space-y-2">
                        {s.requests.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-white/70">
                              @{r.user.username}
                            </span>
                            <button
                              type="button"
                              className="text-emerald-400 text-xs"
                              onClick={() =>
                                void respondPlayerSearchRequest(
                                  r.id,
                                  "accept",
                                ).then(load)
                              }
                            >
                              Qəbul
                            </button>
                            <button
                              type="button"
                              className="text-rose-400 text-xs"
                              onClick={() =>
                                void respondPlayerSearchRequest(
                                  r.id,
                                  "reject",
                                ).then(load)
                              }
                            >
                              Rədd
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy || s.spotsLeft <= 0}
                        onClick={() => {
                          setBusy(true);
                          void requestJoinPlayerSearch(s.id)
                            .then(() => {
                              flash("Sorğu göndərildi");
                              return load();
                            })
                            .catch((err) =>
                              flash(
                                err instanceof Error ? err.message : "Xəta",
                              ),
                            )
                            .finally(() => setBusy(false));
                        }}
                      >
                        <Send size={14} />
                        Oynamaq istəyirəm
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {!loading && !error && tab === "Challenges" ? (
          <div className="mt-6 space-y-6">
            {primaryCaptainTeam ? (
              <form
                onSubmit={(e) => void onCreateChallenge(e)}
                className="rounded-2xl border border-white/10 bg-[#101017] p-5 space-y-3"
              >
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Swords size={16} className="text-[#c5f135]" />
                  Rəqib axtar (challenge)
                </h3>
                <Input
                  label="Yer"
                  value={chVenue}
                  onChange={setChVenue}
                  placeholder="Azfar Arena"
                />
                <Input
                  label="Tarix / saat"
                  type="datetime-local"
                  value={chWhen}
                  onChange={setChWhen}
                />
                <Input
                  label="Qeyd"
                  value={chNotes}
                  onChange={setChNotes}
                  placeholder="5v5..."
                />
                <Button type="submit" disabled={busy || !chVenue.trim()}>
                  <Plus size={14} />
                  Challenge yarat
                </Button>
              </form>
            ) : null}

            <div className="space-y-3">
              {challenges.length === 0 ? (
                <p className="text-white/40 text-center py-8">
                  Açıq challenge yoxdur
                </p>
              ) : (
                challenges.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-white/10 bg-[#101017] p-5"
                  >
                    <h3 className="font-semibold text-white">
                      {c.team.name} rəqib axtarır
                    </h3>
                    <div className="flex flex-wrap gap-3 text-xs text-white/45 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(c.scheduledAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {c.venue}
                      </span>
                    </div>

                    {c.team.captainId === user.id ||
                    c.createdById === user.id ? (
                      <div className="mt-3 space-y-2">
                        {c.requests
                          .filter((r) => r.status === "PENDING")
                          .map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="text-white/70">
                                {r.team.name}
                              </span>
                              <button
                                type="button"
                                className="text-emerald-400 text-xs"
                                onClick={() =>
                                  void respondChallengeRequest(
                                    r.id,
                                    "accept",
                                  ).then(load)
                                }
                              >
                                Qəbul → oyun yarat
                              </button>
                              <button
                                type="button"
                                className="text-rose-400 text-xs"
                                onClick={() =>
                                  void respondChallengeRequest(
                                    r.id,
                                    "reject",
                                  ).then(load)
                                }
                              >
                                Rədd
                              </button>
                            </div>
                          ))}
                      </div>
                    ) : primaryCaptainTeam ? (
                      <Button
                        size="sm"
                        className="mt-3"
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          void requestChallenge(c.id, {
                            teamId: primaryCaptainTeam.id,
                          })
                            .then(() => {
                              flash("Challenge sorğusu göndərildi");
                              return load();
                            })
                            .catch((err) =>
                              flash(
                                err instanceof Error ? err.message : "Xəta",
                              ),
                            )
                            .finally(() => setBusy(false));
                        }}
                      >
                        <Send size={14} />
                        Challenge qəbul etmək üçün sorğu
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {!loading && !error && tab === "Yoldaşılıq yarat" ? (
          <form
            onSubmit={(e) => void onCreateFriendly(e)}
            className="mt-6 rounded-2xl border border-white/10 bg-[#101017] p-5 space-y-3 max-w-lg"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users size={16} />
              Yoldaşılıq oyunu
            </h3>
            <label className="block text-sm text-white/70">
              Ev sahibi komanda
              <select
                className="mt-1 w-full rounded-xl bg-[#18181f] border border-white/10 px-3 py-2 text-white"
                value={frHome || String(primaryCaptainTeam?.id || "")}
                onChange={(e) => setFrHome(e.target.value)}
              >
                <option value="">Seçin</option>
                {captainTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-white/70">
              Rəqib komanda
              <select
                className="mt-1 w-full rounded-xl bg-[#18181f] border border-white/10 px-3 py-2 text-white"
                value={frAway}
                onChange={(e) => setFrAway(e.target.value)}
              >
                <option value="">Seçin</option>
                {allTeams
                  .filter(
                    (t) =>
                      t.id !==
                      Number(frHome || primaryCaptainTeam?.id || 0),
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <Input
              label="Yer"
              value={frVenue}
              onChange={setFrVenue}
              placeholder="Azfar"
            />
            <Input
              label="Tarix / saat"
              type="datetime-local"
              value={frWhen}
              onChange={setFrWhen}
            />
            <Input
              label="Çatışmayan oyunçu sayı (0 = yox)"
              value={frNeeded}
              onChange={setFrNeeded}
            />
            <Button
              type="submit"
              disabled={busy || !frVenue.trim() || !frAway}
            >
              Oyunu yarat
            </Button>
          </form>
        ) : null}

        {!loading && !error && tab === "Liqaya qoşul" ? (
          <form
            onSubmit={(e) => void onJoinLeague(e)}
            className="mt-6 rounded-2xl border border-white/10 bg-[#101017] p-5 space-y-3 max-w-lg"
          >
            <h3 className="font-semibold text-white">
              Public liqaya sorğu göndər
            </h3>
            <label className="block text-sm text-white/70">
              Liqa
              <select
                className="mt-1 w-full rounded-xl bg-[#18181f] border border-white/10 px-3 py-2 text-white"
                value={joinLeagueId}
                onChange={(e) => setJoinLeagueId(e.target.value)}
              >
                <option value="">Seçin</option>
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-white/70">
              Komandanız
              <select
                className="mt-1 w-full rounded-xl bg-[#18181f] border border-white/10 px-3 py-2 text-white"
                value={joinTeamId || String(primaryCaptainTeam?.id || "")}
                onChange={(e) => setJoinTeamId(e.target.value)}
              >
                <option value="">Seçin</option>
                {captainTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={busy || !joinLeagueId}>
              Sorğu göndər
            </Button>
            <div className="pt-2 space-y-1">
              {leagues.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="block text-sm text-white/50 hover:text-[#c5f135]"
                  onClick={() => navigate(`/leagues/${l.id}`)}
                >
                  {l.name} →
                </button>
              ))}
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
