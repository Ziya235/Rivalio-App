import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  MapPin,
  Plus,
  Send,
  Swords,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button, Card, Input, SelectField, Tabs } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import {
  createTeam,
  fetchTeams,
  requestJoinLeague,
  type TeamSummary,
} from "../api/teams";
import { fetchLeagues } from "../api/leagues";
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

const TABS = [
  "Mənim komandam",
  "Oyunçu axtarışı",
  "Challenge",
  "Public liqalar",
] as const;

type Tab = (typeof TABS)[number];
type ModalKind = "team" | "playerSearch" | "challenge" | null;

function toLocalInputValue(d = new Date(Date.now() + 3600_000)) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Bağla"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101017] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-white/8 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function FootballPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Mənim komandam");
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [allTeams, setAllTeams] = useState<TeamSummary[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [searches, setSearches] = useState<PlayerSearch[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  // Create team form
  const [teamName, setTeamName] = useState("");
  const [teamCity, setTeamCity] = useState("");
  const [teamShort, setTeamShort] = useState("");
  const [teamDesc, setTeamDesc] = useState("");

  // Player search form
  const [psTeamId, setPsTeamId] = useState("");
  const [psOpponentId, setPsOpponentId] = useState("");
  const [psVenue, setPsVenue] = useState("");
  const [psWhen, setPsWhen] = useState(toLocalInputValue());
  const [psNeeded, setPsNeeded] = useState("1");
  const [psNotes, setPsNotes] = useState("");

  // Challenge form
  const [chTeamId, setChTeamId] = useState("");
  const [chVenue, setChVenue] = useState("");
  const [chWhen, setChWhen] = useState(toLocalInputValue());
  const [chNotes, setChNotes] = useState("");

  // League join
  const [joiningLeagueId, setJoiningLeagueId] = useState<number | null>(null);
  const [joinTeamId, setJoinTeamId] = useState("");

  const captainTeams = useMemo(
    () => myTeams.filter((t) => t.captainId === user?.id),
    [myTeams, user?.id],
  );
  const isCaptain = captainTeams.length > 0;
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

  useEffect(() => {
    if (primaryCaptainTeam) {
      setPsTeamId((v) => v || String(primaryCaptainTeam.id));
      setChTeamId((v) => v || String(primaryCaptainTeam.id));
      setJoinTeamId((v) => v || String(primaryCaptainTeam.id));
    }
  }, [primaryCaptainTeam]);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2500);
  };

  const closeModal = () => setModal(null);

  const onCreateTeam = async () => {
    if (!teamName.trim()) {
      flash("Komanda adı mütləqdir");
      return;
    }
    setBusy(true);
    try {
      await createTeam({
        name: teamName.trim(),
        city: teamCity.trim() || undefined,
        shortName: teamShort.trim() || undefined,
        description: teamDesc.trim() || undefined,
      });
      setTeamName("");
      setTeamCity("");
      setTeamShort("");
      setTeamDesc("");
      closeModal();
      flash("Komanda yaradıldı");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onCreatePlayerSearch = async () => {
    const homeTeamId = Number(psTeamId || primaryCaptainTeam?.id);
    const awayTeamId = Number(psOpponentId);
    const needed = Number(psNeeded);
    if (!homeTeamId || !awayTeamId) {
      flash("Öz komandanızı və rəqib komandanı seçin");
      return;
    }
    if (!psVenue.trim() || !needed || needed < 1) {
      flash("Yer və oyunçu sayı mütləqdir");
      return;
    }
    setBusy(true);
    try {
      await createFriendly({
        homeTeamId,
        awayTeamId,
        scheduledAt: new Date(psWhen).toISOString(),
        venue: psVenue.trim(),
        notes: psNotes.trim() || undefined,
        playersNeeded: needed,
      });
      setPsOpponentId("");
      setPsVenue("");
      setPsNotes("");
      setPsNeeded("1");
      closeModal();
      flash("Oyunçu axtarışı yaradıldı");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onCreateChallenge = async () => {
    const teamId = Number(chTeamId || primaryCaptainTeam?.id);
    if (!teamId) {
      flash("Komanda seçin");
      return;
    }
    if (!chVenue.trim()) {
      flash("Yer mütləqdir");
      return;
    }
    setBusy(true);
    try {
      await createChallenge({
        teamId,
        scheduledAt: new Date(chWhen).toISOString(),
        venue: chVenue.trim(),
        notes: chNotes.trim() || undefined,
      });
      setChVenue("");
      setChNotes("");
      closeModal();
      flash("Challenge yaradıldı");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onJoinLeague = async (leagueId: number) => {
    const teamId = Number(joinTeamId || primaryCaptainTeam?.id);
    if (!teamId) {
      flash("Əvvəlcə kapitan olduğunuz komanda seçin");
      return;
    }
    setBusy(true);
    setJoiningLeagueId(leagueId);
    try {
      await requestJoinLeague(leagueId, { teamId });
      flash("Qoşulma sorğusu göndərildi");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
      setJoiningLeagueId(null);
    }
  };

  const captainOptions = [
    { label: "Komanda seçin", value: "" },
    ...captainTeams.map((t) => ({ label: t.name, value: String(t.id) })),
  ];
  const opponentOptions = [
    { label: "Rəqib komanda seçin", value: "" },
    ...allTeams
      .filter(
        (t) => t.id !== Number(psTeamId || primaryCaptainTeam?.id || 0),
      )
      .map((t) => ({ label: t.name, value: String(t.id) })),
  ];

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
            Komandanız, oyunçu axtarışı, challenge və public liqalar
          </p>
        </div>

        {msg ? (
          <div className="mb-4 rounded-xl border border-[#c5f135]/30 bg-[#c5f135]/10 px-4 py-2 text-sm text-[#c5f135]">
            {msg}
          </div>
        ) : null}

        <Tabs
          tabs={[...TABS]}
          active={tab}
          onChange={(t) => setTab(t as Tab)}
        />

        {loading ? (
          <p className="text-white/40 text-center py-16">Yüklənir...</p>
        ) : error ? (
          <p className="text-rose-400 text-center py-16">{error}</p>
        ) : null}

        {/* ── Mənim komandam ── */}
        {!loading && !error && tab === "Mənim komandam" ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-white/45">
                Yaradığınız və ya üzvü olduğunuz komandalar
              </p>
              <Button size="sm" onClick={() => setModal("team")}>
                <Plus size={14} />
                Komanda yarat
              </Button>
            </div>

            {myTeams.length === 0 ? (
              <p className="text-white/40 text-center py-10">
                Hələ komandanız yoxdur. Yeni komanda yaradın.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {myTeams.map((team) => {
                  const captain = team.captainId === user.id;
                  return (
                    <Card
                      key={team.id}
                      hover
                      className="p-5 cursor-pointer"
                      onClick={() => navigate(`/teams/${team.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#c5f135]/15 text-[#c5f135] flex items-center justify-center font-bold shrink-0">
                            {team.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white truncate">
                              {team.name}
                            </h3>
                            {captain ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#c5f135] bg-[#c5f135]/10 border border-[#c5f135]/20 px-2 py-0.5 rounded-full">
                                Kapitan
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                Üzv
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-white/45 mt-2">
                            {team.city ? (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {team.city}
                              </span>
                            ) : null}
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {team._count?.players ?? "—"} oyunçu
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* ── Oyunçu axtarışı ── */}
        {!loading && !error && tab === "Oyunçu axtarışı" ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-white/45">
                Çatışmayan oyunçu üçün açıq axtarışlar
              </p>
              {isCaptain ? (
                <Button size="sm" onClick={() => setModal("playerSearch")}>
                  <Plus size={14} />
                  Axtarış yarat
                </Button>
              ) : (
                <p className="text-xs text-white/35">
                  Axtarış yaratmaq üçün komanda kapitanı olmalısınız
                </p>
              )}
            </div>

            {searches.length === 0 ? (
              <p className="text-white/40 text-center py-10">
                Açıq oyunçu axtarışı yoxdur
              </p>
            ) : (
              <div className="space-y-4">
                {searches.map((s) => (
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
                          {s.status === "FULL" ? (
                            <span className="ml-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                              Oyunçular tapıldı
                            </span>
                          ) : null}
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
                        {s.notes ? (
                          <p className="text-sm text-white/50 mt-2">{s.notes}</p>
                        ) : null}
                      </div>
                      {s.hostTeam.captainId === user.id ||
                      s.hostTeam.captain?.username === user.username ? (
                        <div className="space-y-2">
                          {s.requests.length === 0 ? (
                            <p className="text-xs text-white/35">
                              {s.status === "FULL"
                                ? "Çatışmayan oyunçular tamamlandı"
                                : "Sorğu yoxdur"}
                            </p>
                          ) : (
                            s.requests.map((r) => (
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
                            ))
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          disabled={
                            busy || s.status !== "OPEN" || s.spotsLeft <= 0
                          }
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
                          {s.status === "FULL"
                            ? "Sorğu qəbulu bağlanıb"
                            : "Oynamaq istəyirəm"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── Challenge ── */}
        {!loading && !error && tab === "Challenge" ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-white/45">
                Rəqib axtaran komandalar
              </p>
              {isCaptain ? (
                <Button size="sm" onClick={() => setModal("challenge")}>
                  <Plus size={14} />
                  Challenge yarat
                </Button>
              ) : (
                <p className="text-xs text-white/35">
                  Challenge yaratmaq üçün komanda kapitanı olmalısınız
                </p>
              )}
            </div>

            {challenges.length === 0 ? (
              <p className="text-white/40 text-center py-10">
                Açıq challenge yoxdur
              </p>
            ) : (
              <div className="space-y-3">
                {challenges.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-white/10 bg-[#101017] p-5"
                  >
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Swords size={16} className="text-[#c5f135]" />
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
                    {c.notes ? (
                      <p className="text-sm text-white/50 mt-2">{c.notes}</p>
                    ) : null}

                    {c.team.captainId === user.id ||
                    c.createdById === user.id ? (
                      <div className="mt-3 space-y-2">
                        {c.requests.filter((r) => r.status === "PENDING")
                          .length === 0 ? (
                          <p className="text-xs text-white/35">
                            Gözləyən sorğu yoxdur
                          </p>
                        ) : (
                          c.requests
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
                            ))
                        )}
                      </div>
                    ) : isCaptain && primaryCaptainTeam ? (
                      <Button
                        size="sm"
                        className="mt-3"
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          void requestChallenge(c.id, {
                            teamId: Number(chTeamId || primaryCaptainTeam.id),
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
                        Challenge sorğusu göndər
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── Public liqalar ── */}
        {!loading && !error && tab === "Public liqalar" ? (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <p className="text-sm text-white/45">
                Public liqalara baxın və kapitan kimi sorğu göndərin
              </p>
              {isCaptain ? (
                <SelectField
                  className="sm:w-56"
                  value={joinTeamId || String(primaryCaptainTeam?.id || "")}
                  onChange={setJoinTeamId}
                  options={captainOptions.filter((o) => o.value)}
                />
              ) : null}
            </div>

            {!isCaptain ? (
              <p className="text-xs text-amber-400/80 mb-4">
                Liqaya request göndərmək üçün komanda kapitanı olmalısınız
              </p>
            ) : null}

            {leagues.length === 0 ? (
              <p className="text-white/40 text-center py-10">
                Public liqa yoxdur
              </p>
            ) : (
              <div className="space-y-3">
                {leagues.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-white/10 bg-[#101017] p-5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      className="text-left min-w-0"
                      onClick={() => navigate(`/leagues/${l.id}`)}
                    >
                      <h3 className="font-semibold text-white flex items-center gap-2 hover:text-[#c5f135] transition-colors">
                        <Trophy size={16} className="text-[#c5f135] shrink-0" />
                        {l.name}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-xs text-white/45 mt-2">
                        {l.season ? <span>{l.season}</span> : null}
                        <span>{l.status}</span>
                        {l._count?.teams != null ? (
                          <span>{l._count.teams} komanda</span>
                        ) : null}
                      </div>
                      {l.description ? (
                        <p className="text-sm text-white/50 mt-2 line-clamp-2">
                          {l.description}
                        </p>
                      ) : null}
                    </button>
                    {isCaptain ? (
                      <Button
                        size="sm"
                        disabled={busy && joiningLeagueId === l.id}
                        onClick={() => void onJoinLeague(l.id)}
                      >
                        <Send size={14} />
                        Request göndər
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Create team modal */}
      <Modal
        open={modal === "team"}
        title="Komanda yarat"
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={busy}>
              Ləğv et
            </Button>
            <Button
              disabled={busy || !teamName.trim()}
              onClick={() => void onCreateTeam()}
            >
              Yarat
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onCreateTeam();
          }}
          className="space-y-3"
        >
          <Input
            label="Komanda adı *"
            value={teamName}
            onChange={setTeamName}
            placeholder="Bakı Strikerlər"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Şəhər"
              value={teamCity}
              onChange={setTeamCity}
              placeholder="Bakı"
            />
            <Input
              label="Qısa ad"
              value={teamShort}
              onChange={setTeamShort}
              placeholder="BS"
            />
          </div>
          <Input
            label="Təsvir"
            value={teamDesc}
            onChange={setTeamDesc}
            placeholder="Qısa təsvir..."
          />
        </form>
      </Modal>

      {/* Player search modal */}
      <Modal
        open={modal === "playerSearch"}
        title="Yoldaşlıq oyunu üçün oyunçu axtar"
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={busy}>
              Ləğv et
            </Button>
            <Button
              disabled={busy || !psVenue.trim() || !psOpponentId}
              onClick={() => void onCreatePlayerSearch()}
            >
              Yarat
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onCreatePlayerSearch();
          }}
          className="space-y-3"
        >
          <SelectField
            label="Öz komandanız"
            value={psTeamId}
            onChange={(value) => {
              setPsTeamId(value);
              if (value === psOpponentId) setPsOpponentId("");
            }}
            options={captainOptions}
          />
          <SelectField
            label="Rəqib komanda"
            value={psOpponentId}
            onChange={setPsOpponentId}
            options={opponentOptions}
          />
          <Input
            label="Yer *"
            value={psVenue}
            onChange={setPsVenue}
            placeholder="Azfar Arena"
          />
          <Input
            label="Tarix / saat"
            type="datetime-local"
            value={psWhen}
            onChange={setPsWhen}
          />
          <Input
            label="Lazım olan oyunçu sayı *"
            value={psNeeded}
            onChange={setPsNeeded}
            type="number"
          />
          <Input
            label="Qeyd"
            value={psNotes}
            onChange={setPsNotes}
            placeholder="5v5, qapıçı lazımdır..."
          />
        </form>
      </Modal>

      {/* Challenge modal */}
      <Modal
        open={modal === "challenge"}
        title="Challenge yarat"
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={busy}>
              Ləğv et
            </Button>
            <Button
              disabled={busy || !chVenue.trim()}
              onClick={() => void onCreateChallenge()}
            >
              Yarat
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onCreateChallenge();
          }}
          className="space-y-3"
        >
          <SelectField
            label="Komandanız"
            value={chTeamId}
            onChange={setChTeamId}
            options={captainOptions}
          />
          <Input
            label="Yer *"
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
        </form>
      </Modal>
    </div>
  );
}
