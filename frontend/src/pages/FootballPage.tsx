import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Check,
  Clock,
  Hourglass,
  ImagePlus,
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
import type { AppOutletContext } from "../App";
import {
  createTeam,
  fetchTeams,
  requestJoinLeague,
  uploadImage,
  type TeamSummary,
} from "../api/teams";
import { fetchLeagues } from "../api/leagues";
import {
  createChallenge,
  createPlayerSearch,
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

const MIN_MATCH_LEAD_MS = 60 * 60 * 1000;
const TOO_SOON_MSG = "Matç ən azı 1 saat sonra yaradıla bilər";

function toLocalInputValue(d = new Date(Date.now() + MIN_MATCH_LEAD_MS)) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isMatchTooSoon(localDatetime: string) {
  const when = new Date(localDatetime);
  if (Number.isNaN(when.getTime())) return true;
  return when.getTime() < Date.now() + MIN_MATCH_LEAD_MS;
}

function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  light = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  light?: boolean;
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
        className={`relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl ${
          light
            ? "border border-gray-200 bg-white"
            : "border border-white/10 bg-[#101017]"
        }`}
      >
        <div className={`flex items-center justify-between border-b px-5 py-4 ${light ? "border-gray-200" : "border-white/8"}`}>
          <h2 className={`text-lg font-bold ${light ? "text-gray-900" : "text-white"}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-1.5 ${light ? "text-gray-400 hover:bg-gray-100 hover:text-gray-700" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className={`flex items-center justify-end gap-3 border-t px-5 py-4 ${light ? "border-gray-200" : "border-white/8"}`}>
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
  const { isDarkMode } = useOutletContext<AppOutletContext>();
  const light = !isDarkMode;
  const [tab, setTab] = useState<Tab>("Mənim komandam");
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [searches, setSearches] = useState<PlayerSearch[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  // Create team form
  const [teamName, setTeamName] = useState("");
  const [teamCity, setTeamCity] = useState("");
  const [teamShort, setTeamShort] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);
  const teamLogoInputRef = useRef<HTMLInputElement>(null);

  // Player search form
  const [psTeamId, setPsTeamId] = useState("");
  const [psVenue, setPsVenue] = useState("");
  const [psWhen, setPsWhen] = useState(toLocalInputValue());
  const [psNeeded, setPsNeeded] = useState("1");
  const [psNotes, setPsNotes] = useState("");

  // Challenge form
  const [chTeamId, setChTeamId] = useState("");
  const [chVenue, setChVenue] = useState("");
  const [chWhen, setChWhen] = useState(toLocalInputValue());
  const [chNotes, setChNotes] = useState("");
  const [chReqTeamById, setChReqTeamById] = useState<Record<number, string>>(
    {},
  );

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
      const [mine, ch, ps, lg] = await Promise.all([
        fetchTeams({ mine: true }),
        fetchChallenges(),
        fetchPlayerSearches(),
        fetchLeagues(),
      ]);
      setMyTeams(mine);
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

  const flash = (text: string, type: "success" | "error" = "success") => {
    setToast({ message: text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const resetTeamForm = () => {
    setTeamName("");
    setTeamCity("");
    setTeamShort("");
    setTeamDesc("");
    setTeamLogoFile(null);
    setTeamLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (teamLogoInputRef.current) teamLogoInputRef.current.value = "";
  };

  const closeModal = () => {
    if (modal === "team") resetTeamForm();
    setModal(null);
  };

  const onTeamLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("Yalnız şəkil faylı seçin", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      flash("Şəkil maksimum 5MB ola bilər", "error");
      return;
    }
    setTeamLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setTeamLogoFile(file);
  };

  const clearTeamLogo = () => {
    setTeamLogoFile(null);
    setTeamLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (teamLogoInputRef.current) teamLogoInputRef.current.value = "";
  };

  const onCreateTeam = async () => {
    if (!teamName.trim()) {
      flash("Komanda adı mütləqdir", "error");
      return;
    }
    setBusy(true);
    try {
      let logo: string | undefined;
      if (teamLogoFile) {
        logo = await uploadImage(teamLogoFile);
      }
      await createTeam({
        name: teamName.trim(),
        city: teamCity.trim() || undefined,
        shortName: teamShort.trim() || undefined,
        description: teamDesc.trim() || undefined,
        logo,
      });
      resetTeamForm();
      setModal(null);
      flash("Komanda yaradıldı");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta", "error");
    } finally {
      setBusy(false);
    }
  };

  const onCreatePlayerSearch = async () => {
    const hostTeamId = Number(psTeamId || primaryCaptainTeam?.id);
    const needed = Number(psNeeded);
    if (!hostTeamId) {
      flash("Öz komandanızı seçin", "error");
      return;
    }
    if (!psVenue.trim() || !needed || needed < 1) {
      flash("Yer və oyunçu sayı mütləqdir", "error");
      return;
    }
    if (isMatchTooSoon(psWhen)) {
      flash(TOO_SOON_MSG, "error");
      return;
    }
    setBusy(true);
    try {
      await createPlayerSearch({
        hostTeamId,
        scheduledAt: new Date(psWhen).toISOString(),
        venue: psVenue.trim(),
        notes: psNotes.trim() || undefined,
        playersNeeded: needed,
      });
      setPsVenue("");
      setPsNotes("");
      setPsNeeded("1");
      closeModal();
      flash("Oyunçu axtarışı yaradıldı");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta", "error");
    } finally {
      setBusy(false);
    }
  };

  const onCreateChallenge = async () => {
    const teamId = Number(chTeamId || primaryCaptainTeam?.id);
    if (!teamId) {
      flash("Komanda seçin", "error");
      return;
    }
    if (!chVenue.trim()) {
      flash("Yer mütləqdir", "error");
      return;
    }
    if (isMatchTooSoon(chWhen)) {
      flash(TOO_SOON_MSG, "error");
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
      flash(err instanceof Error ? err.message : "Xəta", "error");
    } finally {
      setBusy(false);
    }
  };

  const onJoinLeague = async (leagueId: number) => {
    const teamId = Number(joinTeamId || primaryCaptainTeam?.id);
    if (!teamId) {
      flash("Əvvəlcə kapitan olduğunuz komanda seçin", "error");
      return;
    }
    setBusy(true);
    setJoiningLeagueId(leagueId);
    try {
      await requestJoinLeague(leagueId, { teamId });
      flash("Qoşulma sorğusu göndərildi");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Xəta", "error");
    } finally {
      setBusy(false);
      setJoiningLeagueId(null);
    }
  };

  const captainOptions = [
    { label: "Komanda seçin", value: "" },
    ...captainTeams.map((t) => ({ label: t.name, value: String(t.id) })),
  ];
  if (!user) {
    return (
      <div className={`min-h-screen pt-24 text-center ${light ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]" : "bg-[#08080e]"}`}>
        <p className={`mb-4 ${light ? "text-gray-500" : "text-white/50"}`}>Futbol bölməsi üçün daxil olun</p>
        <Button onClick={() => navigate("/login")}>Giriş</Button>
      </div>
    );
  }

  const isOwnSearch = (s: PlayerSearch) =>
    s.createdById === user.id ||
    s.hostTeam.captainId === user.id ||
    s.hostTeam.captain?.username === user.username;
  const mySearches = searches.filter(isOwnSearch);
  const otherSearches = searches.filter((s) => !isOwnSearch(s));
  const isOwnChallenge = (c: Challenge) =>
    c.createdById === user.id || c.team.captainId === user.id;
  const myChallenges = challenges.filter(isOwnChallenge);
  const otherChallenges = challenges.filter((c) => !isOwnChallenge(c));

  return (
    <div className={`min-h-screen pt-24 pb-20 ${light ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]" : "bg-[#08080e]"}`}>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className={`font-display text-5xl font-bold ${light ? "text-gray-900" : "text-white"}`}>Futbol</h1>
          <p className={`mt-1 ${light ? "text-gray-500" : "text-white/45"}`}>
            Komandanız, oyunçu axtarışı, challenge və public liqalar
          </p>
        </div>

        {toast ? (
          <div
            className={`fixed top-6 right-6 z-[999] max-w-sm px-5 py-3 rounded-xl border text-sm font-medium backdrop-blur-sm shadow-lg ${
              toast.type === "error"
                ? light
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
                : light
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : "border-[#c5f135]/30 bg-[#c5f135]/10 text-[#c5f135]"
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        <Tabs
          tabs={[...TABS]}
          active={tab}
          onChange={(t) => setTab(t as Tab)}
          light={light}
        />

        {loading ? (
          <p className={`text-center py-16 ${light ? "text-gray-400" : "text-white/40"}`}>Yüklənir...</p>
        ) : error ? (
          <p className="text-rose-400 text-center py-16">{error}</p>
        ) : null}

        {/* ── Mənim komandam ── */}
        {!loading && !error && tab === "Mənim komandam" ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className={`text-sm ${light ? "text-gray-500" : "text-white/45"}`}>
                Yaradığınız və ya üzvü olduğunuz komandalar
              </p>
              <Button size="sm" onClick={() => setModal("team")}>
                <Plus size={14} />
                Komanda yarat
              </Button>
            </div>

            {myTeams.length === 0 ? (
              <p className={`text-center py-10 ${light ? "text-gray-400" : "text-white/40"}`}>
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
                      light={light}
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
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${light ? "bg-emerald-500/15 text-emerald-600" : "bg-[#c5f135]/15 text-[#c5f135]"}`}>
                            {team.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-semibold truncate ${light ? "text-gray-900" : "text-white"}`}>
                              {team.name}
                            </h3>
                            {captain ? (
                              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${light ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-[#c5f135] bg-[#c5f135]/10 border-[#c5f135]/20"}`}>
                                Kapitan
                              </span>
                            ) : (
                              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${light ? "text-gray-500 bg-gray-100 border-gray-200" : "text-white/50 bg-white/5 border-white/10"}`}>
                                Üzv
                              </span>
                            )}
                          </div>
                          <div className={`flex flex-wrap gap-3 text-xs mt-2 ${light ? "text-gray-400" : "text-white/45"}`}>
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
              <p className={`text-sm ${light ? "text-gray-500" : "text-white/45"}`}>
                Çatışmayan oyunçu üçün açıq axtarışlar
              </p>
              {isCaptain ? (
                <Button size="sm" onClick={() => setModal("playerSearch")}>
                  <Plus size={14} />
                  Axtarış yarat
                </Button>
              ) : (
                <p className={`text-xs ${light ? "text-gray-400" : "text-white/35"}`}>
                  Axtarış yaratmaq üçün komanda kapitanı olmalısınız
                </p>
              )}
            </div>

            {([
              {
                title: "Sənin axtarışların",
                items: mySearches,
                empty: "Hələ axtarışınız yoxdur",
              },
              {
                title: "Digər axtarışlar",
                items: otherSearches,
                empty: "Açıq oyunçu axtarışı yoxdur",
              },
            ] as const).map((section) => (
              <section key={section.title} className="mb-8 last:mb-0">
                <h2
                  className={`mb-3 text-sm font-semibold uppercase tracking-wider ${
                    light ? "text-gray-500" : "text-white/40"
                  }`}
                >
                  {section.title}
                  <span className={`ml-2 font-medium normal-case tracking-normal ${light ? "text-gray-400" : "text-white/30"}`}>
                    {section.items.length}
                  </span>
                </h2>
                {section.items.length === 0 ? (
                  <p className={`text-center py-8 text-sm ${light ? "text-gray-400" : "text-white/40"}`}>
                    {section.empty}
                  </p>
                ) : (
              <div className="space-y-4">
                {section.items.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-2xl border p-5 ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                        <h3 className={`font-semibold text-lg ${light ? "text-gray-900" : "text-white"}`}>
                          <button
                            type="button"
                            onClick={() => navigate(`/teams/${s.hostTeam.id}`)}
                            className={`text-left transition-colors cursor-pointer ${light ? "hover:text-emerald-600" : "hover:text-[#c5f135]"}`}
                          >
                            {s.hostTeam.name}
                          </button>
                          {s.status === "FULL" ? (
                            <span className="ml-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                              Oyunçular tapıldı
                            </span>
                          ) : null}
                        </h3>
                        <div className={`flex flex-wrap gap-3 text-xs mt-2 ${light ? "text-gray-400" : "text-white/45"}`}>
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
                          <p className={`text-sm mt-2 ${light ? "text-gray-500" : "text-white/50"}`}>{s.notes}</p>
                        ) : null}
                        </div>
                      {!(
                        s.hostTeam.captainId === user.id ||
                        s.hostTeam.captain?.username === user.username
                      ) ? (
                        s.myRequest?.status === "PENDING" ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            light
                              ? "border-amber-200 bg-amber-50 text-amber-600"
                              : "border-amber-400/25 bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          <Hourglass size={13} />
                          Gözləyir
                        </span>
                      ) : s.myRequest?.status === "ACCEPTED" ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            light
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          <Check size={13} />
                          Qəbul edildi
                        </span>
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
                                  "error",
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
                      )
                      ) : null}
                      </div>
                      {s.hostTeam.captainId === user.id ||
                      s.hostTeam.captain?.username === user.username
                        ? (() => {
                            const pending = s.requests.filter(
                              (r) => r.status === "PENDING",
                            );
                            return (
                        <div
                          className={`rounded-xl border ${
                            light
                              ? "border-gray-200 bg-gray-50/80"
                              : "border-white/8 bg-white/[0.03]"
                          }`}
                        >
                          {pending.length === 0 ? (
                            <p
                              className={`px-3 py-2.5 text-xs ${
                                light ? "text-gray-400" : "text-white/35"
                              }`}
                            >
                              {s.status === "FULL"
                                ? "Çatışmayan oyunçular tamamlandı"
                                : "Hələ sorğu yoxdur"}
                            </p>
                          ) : (
                            <>
                              <div
                                className={`flex items-center justify-between border-b px-3 py-2 ${
                                  light ? "border-gray-200" : "border-white/8"
                                }`}
                              >
                                <p
                                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                                    light ? "text-gray-400" : "text-white/40"
                                  }`}
                                >
                                  Gələn sorğular
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    light
                                      ? "bg-white text-gray-500"
                                      : "bg-white/8 text-white/50"
                                  }`}
                                >
                                  {pending.length}
                                </span>
                              </div>
                              <div
                                className={`max-h-56 overflow-y-auto divide-y ${
                                  light ? "divide-gray-200" : "divide-white/10"
                                }`}
                              >
                                {pending.map((r) => {
                                  const fullName =
                                    `${r.user.firstName} ${r.user.lastName}`.trim();
                                  return (
                                    <div
                                      key={r.id}
                                      className="flex items-center gap-2.5 px-3 py-2"
                                    >
                                      {r.user.image ? (
                                        <img
                                          src={r.user.image}
                                          alt=""
                                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div
                                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                            light
                                              ? "bg-emerald-500/15 text-emerald-600"
                                              : "bg-[#c5f135]/15 text-[#c5f135]"
                                          }`}
                                        >
                                          {(r.user.firstName || r.user.username)
                                            .slice(0, 1)
                                            .toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className={`truncate text-sm font-medium ${
                                            light ? "text-gray-900" : "text-white"
                                          }`}
                                        >
                                          {fullName || r.user.username}
                                        </p>
                                        <p
                                          className={`truncate text-[11px] ${
                                            light ? "text-gray-400" : "text-white/40"
                                          }`}
                                        >
                                          @{r.user.username}
                                          {r.message ? ` · ${r.message}` : ""}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 gap-1.5">
                                        <button
                                          type="button"
                                          title="Qəbul"
                                          disabled={respondingId === r.id}
                                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 text-[11px] font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                                          onClick={() => {
                                            setRespondingId(r.id);
                                            void respondPlayerSearchRequest(
                                              r.id,
                                              "accept",
                                            )
                                              .then(() => {
                                                flash("Sorğu qəbul edildi");
                                                return load();
                                              })
                                              .catch((err) =>
                                                flash(
                                                  err instanceof Error
                                                    ? err.message
                                                    : "Xəta",
                                                  "error",
                                                ),
                                              )
                                              .finally(() => setRespondingId(null));
                                          }}
                                        >
                                          <Check size={13} />
                                          Qəbul
                                        </button>
                                        <button
                                          type="button"
                                          title="Rədd"
                                          disabled={respondingId === r.id}
                                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-rose-500/10 px-2.5 text-[11px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                                          onClick={() => {
                                            setRespondingId(r.id);
                                            void respondPlayerSearchRequest(
                                              r.id,
                                              "reject",
                                            )
                                              .then(() => {
                                                flash("Sorğu rədd edildi");
                                                return load();
                                              })
                                              .catch((err) =>
                                                flash(
                                                  err instanceof Error
                                                    ? err.message
                                                    : "Xəta",
                                                  "error",
                                                ),
                                              )
                                              .finally(() => setRespondingId(null));
                                          }}
                                        >
                                          <X size={13} />
                                          Rədd
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                            );
                          })()
                        : null}
                    </div>
                  </div>
                ))}
              </div>
                )}
              </section>
            ))}
          </div>
        ) : null}

        {/* ── Challenge ── */}
        {!loading && !error && tab === "Challenge" ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className={`text-sm ${light ? "text-gray-500" : "text-white/45"}`}>
                Rəqib axtaran komandalar
              </p>
              {isCaptain ? (
                <Button size="sm" onClick={() => setModal("challenge")}>
                  <Plus size={14} />
                  Challenge yarat
                </Button>
              ) : (
                <p className={`text-xs ${light ? "text-gray-400" : "text-white/35"}`}>
                  Challenge yaratmaq üçün komanda kapitanı olmalısınız
                </p>
              )}
            </div>

            {([
              {
                title: "Sənin challenge-ların",
                items: myChallenges,
                empty: "Hələ challenge-ınız yoxdur",
              },
              {
                title: "Digər challenge-lar",
                items: otherChallenges,
                empty: "Açıq challenge yoxdur",
              },
            ] as const).map((section) => (
              <section key={section.title} className="mb-8 last:mb-0">
                <h2
                  className={`mb-3 text-sm font-semibold uppercase tracking-wider ${
                    light ? "text-gray-500" : "text-white/40"
                  }`}
                >
                  {section.title}
                  <span
                    className={`ml-2 font-medium normal-case tracking-normal ${
                      light ? "text-gray-400" : "text-white/30"
                    }`}
                  >
                    {section.items.length}
                  </span>
                </h2>
                {section.items.length === 0 ? (
                  <p
                    className={`text-center py-8 text-sm ${
                      light ? "text-gray-400" : "text-white/40"
                    }`}
                  >
                    {section.empty}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {section.items.map((c) => {
                      const isHost =
                        c.team.captainId === user.id ||
                        c.createdById === user.id;
                      const pending = c.requests.filter(
                        (r) => r.status === "PENDING",
                      );
                      const eligibleTeams = captainTeams.filter(
                        (t) => t.id !== c.teamId,
                      );
                      const pickedTeamId =
                        eligibleTeams.length === 1
                          ? String(eligibleTeams[0].id)
                          : chReqTeamById[c.id] || "";
                      return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border p-5 ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                    <h3 className={`font-semibold flex items-center gap-2 ${light ? "text-gray-900" : "text-white"}`}>
                      <Swords size={16} className={`shrink-0 ${light ? "text-emerald-500" : "text-[#c5f135]"}`} />
                      <button
                        type="button"
                        onClick={() => navigate(`/teams/${c.team.id}`)}
                        className={`text-left transition-colors cursor-pointer ${light ? "hover:text-emerald-600" : "hover:text-[#c5f135]"}`}
                      >
                        {c.team.name}
                      </button>
                      <span className={`font-medium ${light ? "text-gray-400" : "text-white/40"}`}>
                        rəqib axtarır
                      </span>
                      {c.status === "ACCEPTED" ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                          Rəqib tapıldı
                        </span>
                      ) : null}
                    </h3>
                    <div className={`flex flex-wrap gap-3 text-xs mt-2 ${light ? "text-gray-400" : "text-white/45"}`}>
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
                      <p className={`text-sm mt-2 ${light ? "text-gray-500" : "text-white/50"}`}>{c.notes}</p>
                    ) : null}
                      </div>
                      {!isHost ? (
                        c.myRequest?.status === "PENDING" ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              light
                                ? "border-amber-200 bg-amber-50 text-amber-600"
                                : "border-amber-400/25 bg-amber-400/10 text-amber-300"
                            }`}
                          >
                            <Hourglass size={13} />
                            Gözləyir
                          </span>
                        ) : c.myRequest?.status === "ACCEPTED" ||
                          c.status === "ACCEPTED" ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              light
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            <Check size={13} />
                            Qəbul edildi
                          </span>
                        ) : isCaptain && eligibleTeams.length > 0 ? (
                          <div className="flex w-full max-w-xs flex-col items-stretch gap-2 sm:w-auto">
                            {eligibleTeams.length > 1 ? (
                              <SelectField
                                value={pickedTeamId}
                                onChange={(value) =>
                                  setChReqTeamById((prev) => ({
                                    ...prev,
                                    [c.id]: value,
                                  }))
                                }
                                options={[
                                  { label: "Komanda seçin", value: "" },
                                  ...eligibleTeams.map((t) => ({
                                    label: t.name,
                                    value: String(t.id),
                                  })),
                                ]}
                                light={light}
                              />
                            ) : null}
                            <Button
                              size="sm"
                              disabled={busy || !pickedTeamId || c.status !== "OPEN"}
                              onClick={() => {
                                if (!pickedTeamId) {
                                  flash("Hansı komanda ilə sorğu göndərəcəyinizi seçin", "error");
                                  return;
                                }
                                setBusy(true);
                                void requestChallenge(c.id, {
                                  teamId: Number(pickedTeamId),
                                })
                                  .then(() => {
                                    flash("Challenge sorğusu göndərildi");
                                    return load();
                                  })
                                  .catch((err) =>
                                    flash(
                                      err instanceof Error ? err.message : "Xəta",
                                      "error",
                                    ),
                                  )
                                  .finally(() => setBusy(false));
                              }}
                            >
                              <Send size={14} />
                              Challenge sorğusu göndər
                            </Button>
                          </div>
                        ) : null
                      ) : null}
                    </div>

                    {isHost ? (
                      <div
                        className={`mt-4 rounded-xl border ${
                          light
                            ? "border-gray-200 bg-gray-50/80"
                            : "border-white/8 bg-white/[0.03]"
                        }`}
                      >
                        {pending.length === 0 ? (
                          <p
                            className={`px-3 py-2.5 text-xs ${
                              light ? "text-gray-400" : "text-white/35"
                            }`}
                          >
                            {c.status === "ACCEPTED"
                              ? "Rəqib komanda seçildi"
                              : "Gözləyən sorğu yoxdur"}
                          </p>
                        ) : (
                          <>
                            <div
                              className={`flex items-center justify-between border-b px-3 py-2 ${
                                light ? "border-gray-200" : "border-white/8"
                              }`}
                            >
                              <p
                                className={`text-[11px] font-semibold uppercase tracking-wider ${
                                  light ? "text-gray-400" : "text-white/40"
                                }`}
                              >
                                Gələn sorğular
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  light
                                    ? "bg-white text-gray-500"
                                    : "bg-white/8 text-white/50"
                                }`}
                              >
                                {pending.length}
                              </span>
                            </div>
                            <div
                              className={`max-h-56 overflow-y-auto divide-y ${
                                light ? "divide-gray-200" : "divide-white/10"
                              }`}
                            >
                              {pending.map((r) => {
                                const requester = r.requestedBy;
                                const fullName = requester
                                  ? `${requester.firstName} ${requester.lastName}`.trim()
                                  : "";
                                return (
                                  <div
                                    key={r.id}
                                    className="flex items-center gap-2.5 px-3 py-2"
                                  >
                                    {r.team.logo ? (
                                      <img
                                        src={r.team.logo}
                                        alt=""
                                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                                      />
                                    ) : requester?.image ? (
                                      <img
                                        src={requester.image}
                                        alt=""
                                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                                          light
                                            ? "bg-emerald-500/15 text-emerald-600"
                                            : "bg-[#c5f135]/15 text-[#c5f135]"
                                        }`}
                                      >
                                        {r.team.name.slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className={`truncate text-sm font-medium ${
                                          light ? "text-gray-900" : "text-white"
                                        }`}
                                      >
                                        {r.team.name}
                                      </p>
                                      <p
                                        className={`truncate text-[11px] ${
                                          light ? "text-gray-400" : "text-white/40"
                                        }`}
                                      >
                                        {requester
                                          ? `@${requester.username}${fullName ? ` · ${fullName}` : ""}`
                                          : "Kapitan"}
                                        {r.message ? ` · ${r.message}` : ""}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1.5">
                                      <button
                                        type="button"
                                        title="Qəbul"
                                        disabled={respondingId === r.id}
                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 text-[11px] font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                                        onClick={() => {
                                          setRespondingId(r.id);
                                          void respondChallengeRequest(
                                            r.id,
                                            "accept",
                                          )
                                            .then(() => {
                                              flash("Challenge qəbul edildi");
                                              return load();
                                            })
                                            .catch((err) =>
                                              flash(
                                                err instanceof Error
                                                  ? err.message
                                                  : "Xəta",
                                                "error",
                                              ),
                                            )
                                            .finally(() => setRespondingId(null));
                                        }}
                                      >
                                        <Check size={13} />
                                        Qəbul
                                      </button>
                                      <button
                                        type="button"
                                        title="Rədd"
                                        disabled={respondingId === r.id}
                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-rose-500/10 px-2.5 text-[11px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                                        onClick={() => {
                                          setRespondingId(r.id);
                                          void respondChallengeRequest(
                                            r.id,
                                            "reject",
                                          )
                                            .then(() => {
                                              flash("Sorğu rədd edildi");
                                              return load();
                                            })
                                            .catch((err) =>
                                              flash(
                                                err instanceof Error
                                                  ? err.message
                                                  : "Xəta",
                                                "error",
                                              ),
                                            )
                                            .finally(() => setRespondingId(null));
                                        }}
                                      >
                                        <X size={13} />
                                        Rədd
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : null}

        {/* ── Public liqalar ── */}
        {!loading && !error && tab === "Public liqalar" ? (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <p className={`text-sm ${light ? "text-gray-500" : "text-white/45"}`}>
                Public liqalara baxın və kapitan kimi sorğu göndərin
              </p>
              {isCaptain ? (
                <SelectField
                  className="sm:w-56"
                  value={joinTeamId || String(primaryCaptainTeam?.id || "")}
                  onChange={setJoinTeamId}
                  options={captainOptions.filter((o) => o.value)}
                  light={light}
                />
              ) : null}
            </div>

            {!isCaptain ? (
              <p className="text-xs text-amber-400/80 mb-4">
                Liqaya request göndərmək üçün komanda kapitanı olmalısınız
              </p>
            ) : null}

            {leagues.length === 0 ? (
              <p className={`text-center py-10 ${light ? "text-gray-400" : "text-white/40"}`}>
                Public liqa yoxdur
              </p>
            ) : (
              <div className="space-y-3">
                {leagues.map((l) => (
                  <div
                    key={l.id}
                    className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-3 ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}
                  >
                    <button
                      type="button"
                      className="text-left min-w-0"
                      onClick={() => navigate(`/leagues/${l.id}`)}
                    >
                      <h3 className={`font-semibold flex items-center gap-2 transition-colors ${light ? "text-gray-900 hover:text-emerald-600" : "text-white hover:text-[#c5f135]"}`}>
                        <Trophy size={16} className={`shrink-0 ${light ? "text-emerald-500" : "text-[#c5f135]"}`} />
                        {l.name}
                      </h3>
                      <div className={`flex flex-wrap gap-3 text-xs mt-2 ${light ? "text-gray-400" : "text-white/45"}`}>
                        {l.season ? <span>{l.season}</span> : null}
                        <span>{l.status}</span>
                        {l._count?.teams != null ? (
                          <span>{l._count.teams} komanda</span>
                        ) : null}
                      </div>
                      {l.description ? (
                        <p className={`text-sm mt-2 line-clamp-2 ${light ? "text-gray-500" : "text-white/50"}`}>
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
        light={light}
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
          <div>
            <label className={`text-sm font-medium ${light ? "text-gray-700" : "text-white/80"}`}>
              Komanda loqosu
            </label>
            <input
              ref={teamLogoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onTeamLogoChange}
            />
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => teamLogoInputRef.current?.click()}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
                  light
                    ? "border-gray-200 bg-gray-50 text-gray-400 hover:border-emerald-400 hover:text-emerald-600"
                    : "border-white/15 bg-[#18181f] text-white/40 hover:border-[#c5f135]/40 hover:text-[#c5f135]"
                }`}
              >
                {teamLogoPreview ? (
                  <img
                    src={teamLogoPreview}
                    alt="Komanda loqosu"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-1">
                    <ImagePlus size={18} />
                    <span className="text-[10px]">Şəkil</span>
                  </span>
                )}
              </button>
              <div className="min-w-0">
                <p className={`text-sm ${light ? "text-gray-700" : "text-white/70"}`}>
                  {teamLogoFile ? teamLogoFile.name : "jpg, png, webp (max 5MB)"}
                </p>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => teamLogoInputRef.current?.click()}
                    className={`text-xs font-medium ${light ? "text-emerald-600" : "text-[#c5f135]"}`}
                  >
                    {teamLogoFile ? "Dəyiş" : "Şəkil seç"}
                  </button>
                  {teamLogoFile ? (
                    <button
                      type="button"
                      onClick={clearTeamLogo}
                      className="text-xs font-medium text-rose-400"
                    >
                      Sil
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <Input
            label="Komanda adı *"
            value={teamName}
            onChange={setTeamName}
            placeholder="Bakı Strikerlər"
            light={light}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Şəhər"
              value={teamCity}
              onChange={setTeamCity}
              placeholder="Bakı"
              light={light}
            />
            <Input
              label="Qısa ad"
              value={teamShort}
              onChange={setTeamShort}
              placeholder="BS"
              light={light}
            />
          </div>
          <Input
            label="Təsvir"
            value={teamDesc}
            onChange={setTeamDesc}
            placeholder="Qısa təsvir..."
            light={light}
          />
        </form>
      </Modal>

      {/* Player search modal */}
      <Modal
        open={modal === "playerSearch"}
        title="Yoldaşlıq oyunu üçün oyunçu axtar"
        onClose={closeModal}
        light={light}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={busy}>
              Ləğv et
            </Button>
            <Button
              disabled={busy || !psVenue.trim()}
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
            onChange={setPsTeamId}
            options={captainOptions}
            light={light}
          />
          <Input
            label="Yer *"
            value={psVenue}
            onChange={setPsVenue}
            placeholder="Azfar Arena"
            light={light}
          />
          <Input
            label="Tarix / saat"
            type="datetime-local"
            value={psWhen}
            onChange={setPsWhen}
            light={light}
          />
          <Input
            label="Lazım olan oyunçu sayı *"
            value={psNeeded}
            onChange={setPsNeeded}
            type="number"
            light={light}
          />
          <Input
            label="Qeyd"
            value={psNotes}
            onChange={setPsNotes}
            placeholder="5v5, qapıçı lazımdır..."
            light={light}
          />
        </form>
      </Modal>

      {/* Challenge modal */}
      <Modal
        open={modal === "challenge"}
        title="Challenge yarat"
        onClose={closeModal}
        light={light}
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
            light={light}
          />
          <Input
            label="Yer *"
            value={chVenue}
            onChange={setChVenue}
            placeholder="Azfar Arena"
            light={light}
          />
          <Input
            label="Tarix / saat"
            type="datetime-local"
            value={chWhen}
            onChange={setChWhen}
            light={light}
          />
          <Input
            label="Qeyd"
            value={chNotes}
            onChange={setChNotes}
            placeholder="5v5..."
            light={light}
          />
        </form>
      </Modal>
    </div>
  );
}
