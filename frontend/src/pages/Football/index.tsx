import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Navigate, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Tabs } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import type { AppOutletContext } from "../../App";
import {
  createTeam,
  fetchTeams,
  requestJoinLeague,
  cancelJoinLeagueRequest,
  uploadImage,
  type TeamSummary,
} from "../../api/teams";
import { fetchLeagues } from "../../api/leagues";
import {
  cancelChampionshipJoinRequest,
  fetchVisibleChampionships,
  requestJoinChampionship,
} from "../../api/championships";
import type { ChampionshipListItem } from "../../types/championship";
import {
  createChallenge,
  createPlayerSearch,
  fetchChallenges,
  fetchPlayerSearches,
  requestChallenge,
  requestJoinPlayerSearch,
  cancelChallengeRequest,
  cancelPlayerSearchRequest,
  respondChallengeRequest,
  respondPlayerSearchRequest,
  type Challenge,
  type PlayerSearch,
} from "../../api/social";
import type { League } from "../../types/league";
import { UserSearch } from "../../components/UserSearch";
import { SLUG_TAB, TAB_SLUG, TABS, TOO_SOON_MSG, type ModalKind, type Tab } from "./constants";
import { isMatchTooSoon, toLocalInputValue } from "./helpers";
import {
  ChampionshipList,
  ChallengeTab,
  CreateChallengeModal,
  CreatePlayerSearchModal,
  CreateTeamModal,
  LeagueList,
  PlayerSearchTab,
  TeamTab,
} from "./components";

export default function FootballPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDarkMode } = useOutletContext<AppOutletContext>();
  const light = !isDarkMode;
  const tabFromUrl = SLUG_TAB[searchParams.get("tab") ?? ""];
  const [tab, setTab] = useState<Tab>(tabFromUrl ?? "Komanda profilim");
  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [searches, setSearches] = useState<PlayerSearch[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [championships, setChampionships] = useState<ChampionshipListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  const [teamName, setTeamName] = useState("");
  const [teamCity, setTeamCity] = useState("");
  const [teamShort, setTeamShort] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);
  const teamLogoInputRef = useRef<HTMLInputElement>(null);

  const [psTeamId, setPsTeamId] = useState("");
  const [psVenue, setPsVenue] = useState("");
  const [psWhen, setPsWhen] = useState(toLocalInputValue());
  const [psNeeded, setPsNeeded] = useState("1");
  const [psNotes, setPsNotes] = useState("");

  const [chTeamId, setChTeamId] = useState("");
  const [chVenue, setChVenue] = useState("");
  const [chWhen, setChWhen] = useState(toLocalInputValue());
  const [chNotes, setChNotes] = useState("");
  const [chReqTeamById, setChReqTeamById] = useState<Record<number, string>>({});

  const [joiningLeagueId, setJoiningLeagueId] = useState<number | null>(null);
  const [joiningChampionshipId, setJoiningChampionshipId] = useState<number | null>(null);

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
      const [mine, ch, ps, lg, champs] = await Promise.all([
        fetchTeams({ mine: true }),
        fetchChallenges(),
        fetchPlayerSearches(),
        fetchLeagues({ includeAll: true }),
        fetchVisibleChampionships({ includeAll: true }),
      ]);
      setMyTeams(mine);
      setChallenges(ch);
      setSearches(ps);
      setLeagues(lg.filter((l) => !l.sport || l.sport.code === "FOOTBALL"));
      setChampionships(champs);
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
    if (tabFromUrl && tabFromUrl !== tab) setTab(tabFromUrl);
  }, [tabFromUrl, tab]);

  const setActiveTab = (next: Tab) => {
    setTab(next);
    setSearchParams({ tab: TAB_SLUG[next] }, { replace: true });
  };

  useEffect(() => {
    if (primaryCaptainTeam) {
      setPsTeamId((v) => v || String(primaryCaptainTeam.id));
      setChTeamId((v) => v || String(primaryCaptainTeam.id));
    }
  }, [primaryCaptainTeam]);

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
      toast.error("Yalnız şəkil faylı seçin");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Şəkil maksimum 5MB ola bilər");
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
      toast.error("Komanda adı mütləqdir");
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
      toast.success("Komanda yaradıldı");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onCreatePlayerSearch = async () => {
    const hostTeamId = Number(psTeamId || primaryCaptainTeam?.id);
    const needed = Number(psNeeded);
    if (!hostTeamId) {
      toast.error("Öz komandanızı seçin");
      return;
    }
    if (!psVenue.trim() || !needed || needed < 1) {
      toast.error("Yer və oyunçu sayı mütləqdir");
      return;
    }
    if (isMatchTooSoon(psWhen)) {
      toast.error(TOO_SOON_MSG);
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
      toast.success("Oyunçu axtarışı yaradıldı");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onCreateChallenge = async () => {
    const teamId = Number(chTeamId || primaryCaptainTeam?.id);
    if (!teamId) {
      toast.error("Komanda seçin");
      return;
    }
    if (!chVenue.trim()) {
      toast.error("Yer mütləqdir");
      return;
    }
    if (isMatchTooSoon(chWhen)) {
      toast.error(TOO_SOON_MSG);
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
      toast.success("Oyun təklifi yaradıldı");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onJoinLeague = async (leagueId: number, teamId: number) => {
    if (!teamId) {
      toast.error("Əvvəlcə kapitan olduğunuz komanda seçin");
      return;
    }
    setBusy(true);
    setJoiningLeagueId(leagueId);
    try {
      await requestJoinLeague(leagueId, { teamId });
      toast.success("Qoşulma sorğusu göndərildi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
      setJoiningLeagueId(null);
    }
  };

  const onCancelJoinLeague = async (requestId: number) => {
    setBusy(true);
    try {
      await cancelJoinLeagueRequest(requestId);
      toast.success("Sorğu ləğv edildi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onJoinChampionship = async (championshipId: number, teamId: number) => {
    if (!teamId) {
      toast.error("Əvvəlcə kapitan olduğunuz komanda seçin");
      return;
    }
    setBusy(true);
    setJoiningChampionshipId(championshipId);
    try {
      await requestJoinChampionship(championshipId, { teamId });
      toast.success("Qoşulma sorğusu göndərildi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
      setJoiningChampionshipId(null);
    }
  };

  const onCancelJoinChampionship = async (requestId: number) => {
    setBusy(true);
    try {
      await cancelChampionshipJoinRequest(requestId);
      toast.success("Sorğu ləğv edildi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onCancelPlayerSearchRequest = async (requestId: number) => {
    setBusy(true);
    try {
      await cancelPlayerSearchRequest(requestId);
      toast.success("Sorğu ləğv edildi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onCancelChallengeRequest = async (requestId: number) => {
    setBusy(true);
    try {
      await cancelChallengeRequest(requestId);
      toast.success("Sorğu ləğv edildi");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xəta");
    } finally {
      setBusy(false);
    }
  };

  const onJoinPlayerSearch = (searchId: number) => {
    setBusy(true);
    void requestJoinPlayerSearch(searchId)
      .then(() => {
        toast.success("Sorğu göndərildi");
        return load();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Xəta"))
      .finally(() => setBusy(false));
  };

  const onRespondPlayerSearch = (requestId: number, action: "accept" | "reject") => {
    setRespondingId(requestId);
    void respondPlayerSearchRequest(requestId, action)
      .then(() => {
        toast.success(action === "accept" ? "Sorğu qəbul edildi" : "Sorğu rədd edildi");
        return load();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Xəta"))
      .finally(() => setRespondingId(null));
  };

  const onRequestChallenge = (challengeId: number, teamId: string) => {
    if (!teamId) {
      toast.error("Hansı komanda ilə sorğu göndərəcəyinizi seçin");
      return;
    }
    setBusy(true);
    void requestChallenge(challengeId, { teamId: Number(teamId) })
      .then(() => {
        toast.success("Sorğu göndərildi");
        return load();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Xəta"))
      .finally(() => setBusy(false));
  };

  const onRespondChallenge = (requestId: number, action: "accept" | "reject") => {
    setRespondingId(requestId);
    void respondChallengeRequest(requestId, action)
      .then(() => {
        toast.success(action === "accept" ? "Challenge qəbul edildi" : "Sorğu rədd edildi");
        return load();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Xəta"))
      .finally(() => setRespondingId(null));
  };

  const captainOptions = captainTeams.map((t) => ({
    label: t.name,
    value: String(t.id),
  }));

  const openLeague = (league: League) => {
    if (league.canView === false) {
      toast.error("Bu özəl liqaya yalnız iştirakçılar baxa bilər");
      return;
    }
    navigate(`/leagues/${league.id}`);
  };

  const openChampionship = (item: ChampionshipListItem) => {
    if (item.canView === false) {
      toast.error("Bu özəl çempionata yalnız iştirakçılar baxa bilər");
      return;
    }
    navigate(`/sports/football/championships/${item.id}`);
  };

  if (!user) {
    return <Navigate to="/login" replace />;
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
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={`font-display text-5xl font-bold ${light ? "text-gray-900" : "text-white"}`}>Futbol</h1>
            <p className={`mt-1 ${light ? "text-gray-500" : "text-white/45"}`}>
              Komandanız, oyunçu axtarışı, oyun təklifləri, liqalar və çempionatlar
            </p>
          </div>
          <UserSearch light={light} />
        </div>

        <Tabs
          tabs={[...TABS]}
          active={tab}
          onChange={(t) => setActiveTab(t as Tab)}
          light={light}
        />

        {loading ? (
          <p className={`text-center py-16 ${light ? "text-gray-400" : "text-white/40"}`}>Yüklənir...</p>
        ) : error ? (
          <p className="text-rose-400 text-center py-16">{error}</p>
        ) : null}

        {!loading && !error && tab === "Komanda profilim" ? (
          <TeamTab
            light={light}
            myTeams={myTeams}
            userId={user.id}
            onCreate={() => setModal("team")}
            onOpenTeam={(id) => navigate(`/teams/${id}`)}
          />
        ) : null}

        {!loading && !error && tab === "Oyunçu axtarışı" ? (
          <PlayerSearchTab
            light={light}
            isCaptain={isCaptain}
            mySearches={mySearches}
            otherSearches={otherSearches}
            userId={user.id}
            username={user.username}
            busy={busy}
            respondingId={respondingId}
            onCreate={() => setModal("playerSearch")}
            onOpenTeam={(id) => navigate(`/teams/${id}`)}
            onCancelRequest={(id) => void onCancelPlayerSearchRequest(id)}
            onJoin={onJoinPlayerSearch}
            onRespond={onRespondPlayerSearch}
          />
        ) : null}

        {!loading && !error && tab === "Oyun təklifləri" ? (
          <ChallengeTab
            light={light}
            isCaptain={isCaptain}
            captainTeams={captainTeams}
            myChallenges={myChallenges}
            otherChallenges={otherChallenges}
            userId={user.id}
            busy={busy}
            respondingId={respondingId}
            chReqTeamById={chReqTeamById}
            onCreate={() => setModal("challenge")}
            onOpenTeam={(id) => navigate(`/teams/${id}`)}
            onCancelRequest={(id) => void onCancelChallengeRequest(id)}
            onPickTeam={(challengeId, teamId) =>
              setChReqTeamById((prev) => ({ ...prev, [challengeId]: teamId }))
            }
            onRequest={onRequestChallenge}
            onRespond={onRespondChallenge}
          />
        ) : null}

        {!loading && !error && tab === "Liqalar" ? (
          <LeagueList
            light={light}
            items={leagues}
            emptyText="Liqa yoxdur"
            hint="İctimai və özəl liqalar.  Özəl liqaya yalnız iştirakçılar baxa bilər"
            isCaptain={isCaptain}
            captainTeams={captainTeams}
            myTeams={myTeams}
            busy={busy}
            joiningLeagueId={joiningLeagueId}
            onOpen={openLeague}
            onJoin={(id, teamId) => void onJoinLeague(id, teamId)}
            onCancel={(id) => void onCancelJoinLeague(id)}
          />
        ) : null}

        {!loading && !error && tab === "Çempionatlar" ? (
          <ChampionshipList
            light={light}
            items={championships}
            emptyText="Çempionat yoxdur"
            hint="İctimai və özəl çempionatlar. Özəl çempionata yalnız iştirakçılar baxa bilər"
            isCaptain={isCaptain}
            captainTeams={captainTeams}
            busy={busy}
            joiningChampionshipId={joiningChampionshipId}
            onOpen={openChampionship}
            onJoin={(id, teamId) => void onJoinChampionship(id, teamId)}
            onCancel={(id) => void onCancelJoinChampionship(id)}
          />
        ) : null}
      </div>

      <CreateTeamModal
        open={modal === "team"}
        light={light}
        busy={busy}
        teamName={teamName}
        teamCity={teamCity}
        teamShort={teamShort}
        teamDesc={teamDesc}
        teamLogoFile={teamLogoFile}
        teamLogoPreview={teamLogoPreview}
        teamLogoInputRef={teamLogoInputRef}
        onClose={closeModal}
        onSubmit={() => void onCreateTeam()}
        onTeamNameChange={setTeamName}
        onTeamCityChange={setTeamCity}
        onTeamShortChange={setTeamShort}
        onTeamDescChange={setTeamDesc}
        onLogoChange={onTeamLogoChange}
        onClearLogo={clearTeamLogo}
      />

      <CreatePlayerSearchModal
        open={modal === "playerSearch"}
        light={light}
        busy={busy}
        captainOptions={captainOptions}
        psTeamId={psTeamId}
        psVenue={psVenue}
        psWhen={psWhen}
        psNeeded={psNeeded}
        psNotes={psNotes}
        onClose={closeModal}
        onSubmit={() => void onCreatePlayerSearch()}
        onTeamIdChange={setPsTeamId}
        onVenueChange={setPsVenue}
        onWhenChange={setPsWhen}
        onNeededChange={setPsNeeded}
        onNotesChange={setPsNotes}
      />

      <CreateChallengeModal
        open={modal === "challenge"}
        light={light}
        busy={busy}
        captainOptions={captainOptions}
        chTeamId={chTeamId}
        chVenue={chVenue}
        chWhen={chWhen}
        chNotes={chNotes}
        onClose={closeModal}
        onSubmit={() => void onCreateChallenge()}
        onTeamIdChange={setChTeamId}
        onVenueChange={setChVenue}
        onWhenChange={setChWhen}
        onNotesChange={setChNotes}
      />
    </div>
  );
}
