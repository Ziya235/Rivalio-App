import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Check,
  Loader2,
  Medal,
  Pencil,
  Play,
  Plus,
  Radio,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { AdminPageShell } from "../../../components/admin/AdminLayout";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../../components/admin/AdminModal";
import {
  addChampionshipTeam,
  addTeamToGroup,
  cancelChampionshipTeamInvite,
  ChampApiError,
  createChampionshipGroups,
  deleteChampionshipGroup,
  fetchChampionship,
  fetchChampionshipJoinRequests,
  fetchChampionshipMatches,
  fetchChampionshipStatistics,
  fetchGroupStandings,
  finishChampionship,
  removeChampionshipTeam,
  removeTeamFromGroup,
  respondChampionshipJoinRequest,
  startGroupStage,
  startPlayoff,
  updateChampionship,
  updateChampionshipGroup,
  updateChampionshipMatch,
} from "../../../api/championships";
import { fetchTeams, type TeamSummary } from "../../../api/teams";
import { mediaUrl } from "../../../api/base";
import { teamInitialTone } from "../../../lib/teamAvatar";
import {
  GROUP_CAPACITY_MAX,
  GROUP_CAPACITY_MIN,
  GROUP_CHAMP_TEAM_MAX,
  GROUP_CHAMP_TEAM_MIN,
  GROUP_COUNT_MAX,
  GROUP_COUNT_MIN,
  validateGroupSlots,
  type SlotMode,
} from "../../../lib/championshipGroups";
import { sortMatchesByRound } from "../../../lib/championshipUi";
import type {
  Championship,
  ChampionshipGroup,
  ChampionshipJoinRequest,
  ChampionshipStatistics,
  MatchStage,
  PlayoffTieGroup,
  StandingRow,
} from "../../../types/championship";
import type { Match } from "../../../types/match";
import { useSocket } from "../../../context/SocketContext";
import {
  championshipPhase,
  championshipStatusLabel,
  competitionPhaseClass,
} from "../../../lib/competitionStatus";
import { PLAYOFF_STAGES, STAGE_LABEL } from "./constants";
import type { PlayoffBoardTab } from "./constants";
import {
  canEditSchedule,
  formatCompactDate,
  isFixtureReady,
  isKickoffTooSoon,
  isSetupStatus,
  minKickoffLocal,
  playerDisplayName,
  playoffPlaceholders,
  toDatetimeLocal,
} from "./helpers";
import {
  ChampionshipStatsBlock,
  GroupMatchesTabs,
  MatchListSection,
  PlayoffMatchCard,
  PlayoffPlaceholderCard,
  PlayoffStageColumn,
  StandingsTable,
  TeamMark,
} from "./components";

export function AdminChampionshipDetailPage() {
  const { championshipId: idParam } = useParams();
  const championshipId = Number(idParam);
  const navigate = useNavigate();

  const [championship, setChampionship] = useState<Championship | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [statistics, setStatistics] = useState<ChampionshipStatistics>({
    players: [],
    teams: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<ChampionshipJoinRequest[]>(
    [],
  );
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const [allTeams, setAllTeams] = useState<TeamSummary[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);

  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);

  const [scheduleMatch, setScheduleMatch] = useState<Match | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleVenue, setScheduleVenue] = useState("");
  const [playoffView, setPlayoffView] = useState<"playoff" | "groups" | "stats">(
    "playoff",
  );
  const [playoffBoardTab, setPlayoffBoardTab] = useState<PlayoffBoardTab>("overview");
  const [tieGroups, setTieGroups] = useState<PlayoffTieGroup[] | null>(null);
  const [tieOrders, setTieOrders] = useState<Record<string, number[]>>({});

  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
  const [addToGroupModal, setAddToGroupModal] = useState<ChampionshipGroup | null>(
    null,
  );
  const [editGroupModal, setEditGroupModal] = useState<ChampionshipGroup | null>(
    null,
  );

  const [groupCount, setGroupCount] = useState("2");
  const [slotMode, setSlotMode] = useState<SlotMode>("same");
  const [sameSlots, setSameSlots] = useState("4");
  const [perGroupSlots, setPerGroupSlots] = useState<string[]>(["4", "4"]);
  const [autoAssign, setAutoAssign] = useState(true);

  const [pickerTeamId, setPickerTeamId] = useState<number | "">("");
  const [addToGroupTeamId, setAddToGroupTeamId] = useState<number | "">("");

  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupSlots, setEditGroupSlots] = useState("");

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    kind: "team" | "invite";
    id: number;
    name: string;
  } | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);

  const { notifications } = useSocket();
  const champNoticeSignature = notifications
    .filter(
      (item) =>
        item.type === "CHAMPIONSHIP_JOIN_REQUEST" ||
        item.type === "CHAMPIONSHIP_INVITE",
    )
    .map(
      (item) =>
        `${item.id}:${item.championshipJoinRequestStatus ?? ""}:${item.championshipInviteStatus ?? ""}`,
    )
    .join("|");
  const skipNoticeReload = useRef(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!Number.isInteger(championshipId) || championshipId <= 0) {
      setError("Yanlış çempionat");
      setLoading(false);
      return;
    }
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [champ, matchList, stats, joins] = await Promise.all([
        fetchChampionship(championshipId),
        fetchChampionshipMatches(championshipId),
        fetchChampionshipStatistics(championshipId),
        fetchChampionshipJoinRequests(championshipId).catch(() => []),
      ]);
      setChampionship(champ);
      setMatches(matchList);
      setStatistics(stats);
      setJoinRequests(joins);
      if (champ.groups.length > 0) {
        setActiveGroupId((prev) => {
          if (prev && champ.groups.some((g) => g.id === prev)) return prev;
          return champ.groups[0].id;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
      if (!opts?.silent) {
        setChampionship(null);
        setMatches([]);
        setStatistics({ players: [], teams: [] });
        setJoinRequests([]);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [championshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (championship?.status === "GROUP_STAGE") {
      setPlayoffView((current) => (current === "playoff" ? "groups" : current));
    }
  }, [championship?.status]);

  useEffect(() => {
    if (skipNoticeReload.current) {
      skipNoticeReload.current = false;
      return;
    }
    void load({ silent: true });
  }, [champNoticeSignature, load]);

  useEffect(() => {
    if (!activeGroupId) {
      setStandings([]);
      return;
    }
    let cancelled = false;
    setStandingsLoading(true);
    fetchGroupStandings(activeGroupId)
      .then((rows) => {
        if (!cancelled) setStandings(rows);
      })
      .catch(() => {
        if (!cancelled) setStandings([]);
      })
      .finally(() => {
        if (!cancelled) setStandingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeGroupId, matches]);

  useEffect(() => {
    const n = Number(groupCount) || 2;
    setPerGroupSlots((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("4");
      return next.slice(0, n);
    });
  }, [groupCount]);

  const closeAddTeamModal = () => {
    setAddTeamModalOpen(false);
    setTeamSearch("");
    setPickerTeamId("");
    setAllTeams([]);
    setTeamSearchLoading(false);
    setModalError(null);
  };

  useEffect(() => {
    if (!addTeamModalOpen) return;

    const q = teamSearch.trim();
    if (q.length < 1) {
      setAllTeams([]);
      setTeamSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setTeamSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const teams = await fetchTeams({ q }, controller.signal);
        if (controller.signal.aborted) return;
        setAllTeams(teams);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setAllTeams([]);
      } finally {
        if (!controller.signal.aborted) setTeamSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addTeamModalOpen, teamSearch]);

  const pendingInvites = championship?.pendingInvites ?? [];
  const pendingJoins = joinRequests.filter((req) => req.status === "PENDING");

  const enrolledTeamIds = useMemo(
    () => new Set(championship?.teams.map((t) => t.teamId) ?? []),
    [championship?.teams],
  );

  const pendingTeamIds = useMemo(
    () =>
      new Set([
        ...pendingInvites.map((invite) => invite.teamId),
        ...pendingJoins.map((req) => req.teamId),
      ]),
    [pendingInvites, pendingJoins],
  );

  const rosterCount =
    (championship?.teams.length ?? 0) +
    pendingInvites.length +
    pendingJoins.length;

  const teamsInGroups = useMemo(() => {
    const ids = new Set<number>();
    championship?.groups.forEach((g) =>
      g.teams.forEach((gt) => ids.add(gt.teamId)),
    );
    return ids;
  }, [championship?.groups]);

  const unassignedChampTeams = useMemo(
    () =>
      championship?.teams.filter((t) => !teamsInGroups.has(t.teamId)) ?? [],
    [championship?.teams, teamsInGroups],
  );

  const activeGroup = useMemo(
    () => championship?.groups.find((g) => g.id === activeGroupId) ?? null,
    [championship?.groups, activeGroupId],
  );

  const groupMatches = useMemo(() => {
    if (!activeGroupId) return [];
    return matches.filter(
      (m) => m.groupId === activeGroupId && m.stage === "GROUP_STAGE",
    );
  }, [matches, activeGroupId]);

  const liveMatches = useMemo(
    () => sortMatchesByRound(groupMatches.filter((m) => m.status === "LIVE")),
    [groupMatches],
  );
  const upcomingMatches = useMemo(
    () =>
      sortMatchesByRound(
        groupMatches.filter(
          (m) => m.status === "SCHEDULED" || m.status === "POSTPONED",
        ),
      ),
    [groupMatches],
  );
  const finishedMatches = useMemo(
    () =>
      sortMatchesByRound(
        groupMatches.filter(
          (m) => m.status === "FINISHED" || m.status === "CANCELLED",
        ),
      ),
    [groupMatches],
  );

  const playoffMatches = useMemo(
    () => matches.filter((m) => m.stage && m.stage !== "GROUP_STAGE"),
    [matches],
  );

  const playoffByStage = useMemo(() => {
    const map = new Map<MatchStage, Match[]>();
    for (const stage of PLAYOFF_STAGES) map.set(stage, []);
    for (const m of playoffMatches) {
      const stage = m.stage as MatchStage;
      if (map.has(stage)) map.get(stage)!.push(m);
    }
    for (const [stage, rows] of map) {
      rows.sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || a.id - b.id);
      map.set(stage, rows);
    }
    return map;
  }, [playoffMatches]);

  const playoffPlaceholderMap = useMemo(
    () => playoffPlaceholders(playoffMatches),
    [playoffMatches],
  );

  const visiblePlayoffStages = useMemo(
    () =>
      PLAYOFF_STAGES.filter(
        (stage) =>
          (playoffByStage.get(stage)?.length ?? 0) > 0 ||
          (playoffPlaceholderMap.get(stage)?.length ?? 0) > 0,
      ),
    [playoffByStage, playoffPlaceholderMap],
  );

  const scorerRows = useMemo(() => {
    return statistics.players
      .filter((row) => row.goals > 0 || row.assists > 0)
      .sort(
        (a, b) =>
          b.goals - a.goals ||
          b.assists - a.assists ||
          b.goals + b.assists - (a.goals + a.assists) ||
          playerDisplayName(a).localeCompare(playerDisplayName(b), "az"),
      )
      .map((row) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        shirtNumber: row.shirtNumber,
        photo: row.photo,
        teamId: row.teamId,
        teamName: row.team.name,
        teamLogo: row.team.logo,
        goals: row.goals,
        assists: row.assists,
      }));
  }, [statistics.players]);

  const unfinishedGroupMatches = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.stage === "GROUP_STAGE" &&
          m.status !== "FINISHED" &&
          m.status !== "CANCELLED",
      ).length,
    [matches],
  );

  const handleJoinRespond = async (
    requestId: number,
    action: "accept" | "reject",
  ) => {
    setRespondingId(requestId);
    setActionError(null);
    try {
      await respondChampionshipJoinRequest(requestId, action);
      await load({ silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setRespondingId(null);
    }
  };

  const toggleVisibility = async () => {
    if (!championship) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateChampionship(championship.id, {
        visibility:
          championship.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
      });
      await load({ silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setBusy(false);
    }
  };

  const parsedGroupCount = Number(groupCount);
  const resolvedSlots = useMemo(() => {
    const count = Number.isInteger(parsedGroupCount) ? parsedGroupCount : 0;
    if (slotMode === "perGroup") {
      return perGroupSlots.slice(0, count).map((s) => {
        const n = Number(s);
        return Number.isInteger(n) ? n : NaN;
      });
    }
    const n = Number(sameSlots);
    return Array.from({ length: count }, () =>
      Number.isInteger(n) ? n : NaN,
    );
  }, [parsedGroupCount, slotMode, sameSlots, perGroupSlots]);

  const groupsSlotError = useMemo(() => {
    const teamCount = championship?.teams.length ?? 0;
    if (teamCount < GROUP_CHAMP_TEAM_MIN) {
      return `Qrup yaratmaq üçün ən azı ${GROUP_CHAMP_TEAM_MIN} komanda lazımdır`;
    }
    if (teamCount > GROUP_CHAMP_TEAM_MAX) {
      return `Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola bilər`;
    }
    const count = Number(groupCount);
    const slots = resolvedSlots.map((s) => (Number.isInteger(s) ? s : null));
    return validateGroupSlots({
      teamCount,
      groupCount: count,
      slots,
      slotMode,
    });
  }, [championship?.teams.length, groupCount, resolvedSlots, slotMode]);

  const runAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Əməliyyat uğursuz oldu",
      );
    } finally {
      setBusy(false);
    }
  };

  const openSchedule = (match: Match) => {
    if (!canEditSchedule(match)) return;
    setScheduleMatch(match);
    setScheduleAt(toDatetimeLocal(match.scheduledAt));
    setScheduleVenue(match.venue ?? "");
    setModalError(null);
  };

  const enterMatch = (match: Match) => {
    if (canEditSchedule(match) && !isFixtureReady(match)) return;
    navigate(`/admin/football/matches/${match.id}`);
  };

  const handleSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!scheduleMatch || !canEditSchedule(scheduleMatch)) return;
    if (!scheduleAt) {
      setModalError("Oyun vaxtı mütləqdir");
      return;
    }
    if (!scheduleVenue.trim()) {
      setModalError("Məkan mütləqdir");
      return;
    }
    if (isKickoffTooSoon(scheduleAt)) {
      setModalError(
        "Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.",
      );
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const updated = await updateChampionshipMatch(scheduleMatch.id, {
        scheduledAt: new Date(scheduleAt).toISOString(),
        venue: scheduleVenue.trim(),
      });
      setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setScheduleMatch(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Yenilənmədi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleAddTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!pickerTeamId) {
      setModalError("Komanda seçin");
      return;
    }
    if (
      championship &&
      championship.format !== "PLAYOFF_ONLY" &&
      rosterCount >= GROUP_CHAMP_TEAM_MAX
    ) {
      setModalError(`Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola bilər`);
      return;
    }
    if (
      championship?.format === "PLAYOFF_ONLY" &&
      championship.maxTeams != null &&
      rosterCount >= championship.maxTeams
    ) {
      setModalError(`Maksimum ${championship.maxTeams} komanda ola bilər`);
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const updated = await addChampionshipTeam(championshipId, pickerTeamId);
      setChampionship(updated);
      closeAddTeamModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Əlavə edilmədi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const closeRemoveModal = () => {
    if (busy) return;
    setRemoveTarget(null);
    setRemoveError(null);
  };

  const closeDeleteGroupModal = () => {
    if (busy) return;
    setDeleteGroupTarget(null);
    setDeleteGroupError(null);
  };

  const handleRemoveTeam = async () => {
    if (!removeTarget) return;
    setBusy(true);
    setRemoveError(null);
    setActionError(null);
    try {
      const updated =
        removeTarget.kind === "invite"
          ? await cancelChampionshipTeamInvite(championshipId, removeTarget.id)
          : await removeChampionshipTeam(championshipId, removeTarget.id);
      setChampionship(updated);
      setRemoveTarget(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Silinmədi");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateGroups = async (e: FormEvent) => {
    e.preventDefault();
    const count = Number(groupCount);
    if (groupsSlotError) {
      setModalError(groupsSlotError);
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const payload: Parameters<typeof createChampionshipGroups>[1] =
        slotMode === "perGroup"
          ? {
              groupCount: count,
              perGroupSlots: resolvedSlots,
              autoAssign,
            }
          : {
              groupCount: count,
              teamSlots: Number(sameSlots),
              autoAssign,
            };
      await createChampionshipGroups(championshipId, payload);
      setGroupsModalOpen(false);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Qruplar yaradilmadi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleStartGroupStage = () => {
    if (pendingInvites.length > 0) {
      setActionError(
        "Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir.",
      );
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to start this championship? Teams cannot be added after the group stage begins.",
      )
    ) {
      return;
    }
    void runAction(async () => {
      const updated = await startGroupStage(championshipId);
      setChampionship(updated);
      await load();
    });
  };

  const handleFinishChampionship = () => {
    if (
      !window.confirm(
        "Are you sure you want to finish this championship? This action cannot be undone.",
      )
    ) {
      return;
    }
    void runAction(async () => {
      const updated = await finishChampionship(championshipId);
      setChampionship(updated);
      await load();
    });
  };

  const handleStartPlayoff = (playoffOnly = false, tieBreakTeamIds?: number[]) => {
    if (playoffOnly && pendingInvites.length > 0) {
      setActionError(
        "Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir.",
      );
      return;
    }
    const msg = playoffOnly
      ? "Playoff mərhələsini başlatmaq istəyirsiniz? Komanda sayına uyğun cədvəl yaradılacaq."
      : "Qrup mərhələsini bitirib playoff başlatmaq istəyirsiniz?";
    if (!tieBreakTeamIds && !window.confirm(msg)) return;
    void runAction(async () => {
      try {
        await startPlayoff(championshipId, { playoffOnly, tieBreakTeamIds });
        setTieGroups(null);
        setPlayoffView("playoff");
        setScheduleMatch(null);
        await load();
      } catch (err) {
        if (err instanceof ChampApiError && err.code === "PLAYOFF_TIE" && err.ties?.length) {
          setTieGroups(err.ties);
          setTieOrders(
            Object.fromEntries(
              err.ties.map((g) => [g.id, g.teams.map((t) => t.teamId)]),
            ),
          );
          setActionError(err.message);
          return;
        }
        throw err;
      }
    });
  };

  const submitTieBreak = () => {
    if (!tieGroups) return;
    const ids = tieGroups.flatMap((g) => tieOrders[g.id] ?? g.teams.map((t) => t.teamId));
    handleStartPlayoff(false, ids);
  };

  const moveTieTeam = (groupId: string, index: number, dir: -1 | 1) => {
    setTieOrders((prev) => {
      const list = [...(prev[groupId] ?? [])];
      const next = index + dir;
      if (next < 0 || next >= list.length) return prev;
      [list[index], list[next]] = [list[next], list[index]];
      return { ...prev, [groupId]: list };
    });
  };

  const handleAddToGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!addToGroupModal || !addToGroupTeamId) {
      setModalError("Komanda seçin");
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await addTeamToGroup(addToGroupModal.id, addToGroupTeamId);
      setAddToGroupModal(null);
      setAddToGroupTeamId("");
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Əlavə edilmədi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const openEditGroup = (group: ChampionshipGroup) => {
    setEditGroupModal(group);
    setEditGroupName(group.name);
    setEditGroupSlots(
      group.teamSlots != null
        ? String(group.teamSlots)
        : String(GROUP_CAPACITY_MIN),
    );
    setModalError(null);
  };

  const handleEditGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!editGroupModal) return;
    setModalSubmitting(true);
    setModalError(null);
    try {
      await updateChampionshipGroup(editGroupModal.id, {
        name: editGroupName.trim(),
        teamSlots: Number(editGroupSlots),
      });
      setEditGroupModal(null);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Yenilənmədi");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    setBusy(true);
    setDeleteGroupError(null);
    setActionError(null);
    try {
      await deleteChampionshipGroup(deleteGroupTarget.id);
      setDeleteGroupTarget(null);
      await load();
    } catch (err) {
      setDeleteGroupError(err instanceof Error ? err.message : "Silinmədi");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveFromGroup = async (groupId: number, teamId: number) => {
    await runAction(async () => {
      await removeTeamFromGroup(groupId, teamId);
      await load();
    });
  };

  if (!Number.isInteger(championshipId) || championshipId <= 0) {
    return (
      <AdminPageShell title="Çempionat">
        <p className="text-sm text-rose-600">Yanlış çempionat ID.</p>
        <Link
          to="/admin/football/championships"
          className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Siyahıya qayıt
        </Link>
      </AdminPageShell>
    );
  }

  if (loading) {
    return (
      <AdminPageShell title="Çempionat">
        <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>
      </AdminPageShell>
    );
  }

  if (error || !championship) {
    return (
      <AdminPageShell title="Çempionat">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error ?? "Çempionat tapılmadı"}
        </div>
        <Link
          to="/admin/football/championships"
          className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Siyahıya qayıt
        </Link>
      </AdminPageShell>
    );
  }

  const isSetup = isSetupStatus(championship.status);
  const isGroupStage = championship.status === "GROUP_STAGE";
  const isPlayoff =
    championship.status === "PLAYOFF" ||
    championship.status === "COMPLETED" ||
    championship.status === "FINISHED";
  const isPlayoffOnlyFormat = championship.format === "PLAYOFF_ONLY";
  const playoffReady =
    isPlayoffOnlyFormat &&
    championship.maxTeams != null &&
    championship.teams.length === championship.maxTeams;
  const playoffStageTabs: PlayoffBoardTab[] = [
    "overview",
    ...visiblePlayoffStages,
  ];
  const activePlayoffTab =
    playoffBoardTab === "overview" ||
    visiblePlayoffStages.includes(playoffBoardTab)
      ? playoffBoardTab
      : "overview";
  const playoffStatCards = [
    {
      icon: Users,
      value: String(championship.teams.length),
      label: "Komanda",
    },
    {
      icon: Radio,
      value: String(playoffMatches.length),
      label: "Oyun",
    },
    {
      icon: Medal,
      value: String(visiblePlayoffStages.length),
      label: "Mərhələ",
    },
    {
      icon: Trophy,
      value: String(
        playoffByStage.get("FINAL")?.length ??
          playoffPlaceholderMap.get("FINAL")?.length ??
          0,
      ),
      label: "Final",
    },
    {
      icon: Calendar,
      value: formatCompactDate(championship.startDate),
      label: "Başlanğıc",
    },
  ];
  const focusedPlayoffMatches =
    activePlayoffTab === "overview"
      ? []
      : (playoffByStage.get(activePlayoffTab) ?? []);
  const focusedPlayoffPlaceholders =
    activePlayoffTab === "overview"
      ? []
      : (playoffPlaceholderMap.get(activePlayoffTab) ?? []);

  return (
    <AdminPageShell
      title={championship.name}
      subtitle={
        championship.description ||
        `${championship.format === "PLAYOFF_ONLY" ? "Yalnız Playoff" : "Qrup + Playoff"} · ${championship.matchFormat === "HOME_AWAY" ? "Ev-səfər" : "1 oyun"} · ${championship.teamCount} komanda · ${championship.matchCount} oyun`
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          {championship.status === "PLAYOFF" ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleFinishChampionship}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Çempionatı bitir
            </button>
          ) : null}
          <Link
            to="/admin/football/championships"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Siyahı
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${competitionPhaseClass(
            championshipPhase(championship.status),
          )}`}
        >
          {championshipStatusLabel(championship.status)}
        </span>
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
            championship.visibility === "PUBLIC"
              ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          {championship.visibility === "PUBLIC" ? "İctimai" : "Özəl"}
        </span>
        {championship.status === "DRAFT" || championship.status === "REGISTRATION" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleVisibility()}
            className="rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            {championship.visibility === "PUBLIC" ? "Özəl et" : "İctimai et"}
          </button>
        ) : null}
        <span className="text-xs text-slate-400">
          {championship.sport?.name ?? "Futbol"}
        </span>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {actionError}
        </div>
      ) : null}

      {pendingJoins.length > 0 && championship.status === "DRAFT" ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="border-b border-amber-100 px-4 py-3">
            <h2 className="text-base font-bold text-ink">
              Qoşulma sorğuları ({pendingJoins.length})
            </h2>
            <p className="text-xs text-slate-500">
              Planlaşdırılan çempionata komanda kapitanlarından gələn sorğular
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendingJoins.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{req.team.name}</p>
                  <p className="text-xs text-slate-500">
                    @{req.requestedBy?.username ?? "kapitan"} ·{" "}
                    {req.team.city || "Şəhər yoxdur"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={respondingId === req.id}
                    onClick={() => void handleJoinRespond(req.id, "accept")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Qəbul
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === req.id}
                    onClick={() => void handleJoinRespond(req.id, "reject")}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Rədd
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isSetup ? (
        <div
          className={`grid gap-6 ${
            isPlayoffOnlyFormat ? "" : "lg:grid-cols-2"
          }`}
        >
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-bold text-ink">Komandalar</h2>
                <span className="text-xs text-slate-400">
                  {championship.teams.length}
                  {pendingInvites.length > 0
                    ? ` + ${pendingInvites.length} gözləmə`
                    : ""}
                  {isPlayoffOnlyFormat
                    ? championship.maxTeams
                      ? ` / ${championship.maxTeams}`
                      : ""
                    : ` / ${GROUP_CHAMP_TEAM_MAX}`}
                </span>
              </div>
              {championship.status === "DRAFT" ? (
              <button
                type="button"
                disabled={
                  busy ||
                  (isPlayoffOnlyFormat
                    ? championship.maxTeams != null &&
                      rosterCount >= championship.maxTeams
                    : rosterCount >= GROUP_CHAMP_TEAM_MAX)
                }
                onClick={() => {
                  setPickerTeamId("");
                  setTeamSearch("");
                  setAllTeams([]);
                  setModalError(null);
                  setAddTeamModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-brand-dark disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Dəvət et
              </button>
              ) : null}
            </div>
            {isPlayoffOnlyFormat ? (
              <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                Yalnız playoff · {championship.maxTeams ?? "—"} komanda lazımdır
                (4 / 8 / 16). Sonra playoff başla.
              </p>
            ) : (
              <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                {GROUP_CHAMP_TEAM_MIN}–{GROUP_CHAMP_TEAM_MAX} komanda. Komanda
                kapitanı dəvəti qəbul etdikdən sonra qrupa əlavə edə
                bilərsiniz. Başlatmaq üçün minimum {GROUP_CHAMP_TEAM_MIN}{" "}
                qəbul olunmuş komanda lazımdır.
              </p>
            )}
            {championship.teams.length === 0 && pendingInvites.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                Hələ komanda yoxdur. Sistemdən komanda dəvət edin.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingInvites.map((invite) => (
                  <li
                    key={`invite-${invite.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <TeamMark name={invite.team.name} logo={invite.team.logo} />
                      <p className="mt-1 text-[11px] font-medium text-amber-600">
                        Kapitanın təsdiqi gözlənilir
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRemoveError(null);
                        setRemoveTarget({
                          kind: "invite",
                          id: invite.id,
                          name: invite.team.name,
                        });
                      }}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      title="Dəvəti ləğv et"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {championship.teams.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <TeamMark name={row.team.name} logo={row.team.logo} />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRemoveError(null);
                        setRemoveTarget({
                          kind: "team",
                          id: row.teamId,
                          name: row.team.name,
                        });
                      }}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      title="Çıxart"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!isPlayoffOnlyFormat ? (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-brand" />
                  <h2 className="text-sm font-bold text-ink">Qruplar</h2>
                  <span className="text-xs text-slate-400">
                    {championship.groups.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setSlotMode("same");
                    setGroupCount("2");
                    setSameSlots("4");
                    setAutoAssign(true);
                    setGroupsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Qrup yarat
                </button>
              </div>

              {championship.groups.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Qruplar hələ yaradılmayıb. &quot;Qrup yarat&quot; düyməsinə basın.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {championship.groups.map((group) => (
                    <li key={group.id} className="px-4 py-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-ink">{group.name}</p>
                          <p className="text-xs text-slate-500">
                            {group.teams.length}
                            {group.teamSlots != null
                              ? ` / ${group.teamSlots}`
                              : ""}{" "}
                            komanda
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={
                              group.teams.length >=
                              (group.teamSlots ?? GROUP_CAPACITY_MAX)
                            }
                            onClick={() => {
                              setAddToGroupTeamId("");
                              setModalError(null);
                              setAddToGroupModal(group);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink disabled:opacity-40"
                            title="Komanda əlavə et"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditGroup(group)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
                            title="Redaktə"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setDeleteGroupError(null);
                              setDeleteGroupTarget({
                                id: group.id,
                                name: group.name,
                              });
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {group.teams.length === 0 ? (
                        <p className="text-xs text-slate-400">Komanda yoxdur</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {group.teams.map((gt) => (
                            <li
                              key={gt.id}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5"
                            >
                              <TeamMark
                                name={gt.team.name}
                                logo={gt.team.logo}
                                size="sm"
                              />
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void handleRemoveFromGroup(group.id, gt.teamId)
                                }
                                className="text-slate-300 hover:text-rose-600 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <div
            className={`${
              isPlayoffOnlyFormat ? "" : "lg:col-span-2"
            } flex flex-wrap gap-3`}
          >
            {isPlayoffOnlyFormat ? (
              <button
                type="button"
                disabled={busy || !playoffReady || pendingInvites.length > 0}
                onClick={() => handleStartPlayoff(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Playoff başla
                {!playoffReady && championship.maxTeams
                  ? ` (${championship.teams.length}/${championship.maxTeams})`
                  : ""}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  busy ||
                  championship.groups.length === 0 ||
                  championship.teams.length < GROUP_CHAMP_TEAM_MIN ||
                  pendingInvites.length > 0
                }
                onClick={handleStartGroupStage}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Çempionatı başlat
              </button>
            )}
            {pendingInvites.length > 0 ? (
              <p className="w-full text-xs text-amber-700">
                Gözləyən dəvətlər var. Çempionatı başlatmaq üçün dəvətlər qəbul
                olunmalı və ya ləğv edilməlidir.
              </p>
            ) : null}
            {!isPlayoffOnlyFormat &&
            championship.teams.length < GROUP_CHAMP_TEAM_MIN ? (
              <p className="w-full text-xs text-slate-500">
                Başlatmaq üçün ən azı {GROUP_CHAMP_TEAM_MIN} komanda əlavə edin
                ({championship.teams.length}/{GROUP_CHAMP_TEAM_MIN}).
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {isGroupStage ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlayoffView("groups")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  playoffView !== "stats"
                    ? "bg-brand text-ink"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Qrup mərhələsi
              </button>
              <button
                type="button"
                onClick={() => setPlayoffView("stats")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  playoffView === "stats"
                    ? "bg-brand text-ink"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Statistika
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || unfinishedGroupMatches > 0}
                onClick={() => handleStartPlayoff(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                title={
                  unfinishedGroupMatches > 0
                    ? "Əvvəlcə bütün qrup oyunlarını bitirin"
                    : "Playoff mərhələsini başlat"
                }
              >
                <Trophy className="h-4 w-4" />
                Pley-off
              </button>
            </div>
          </div>

          {playoffView === "stats" ? (
            <ChampionshipStatsBlock players={scorerRows} />
          ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {championship.groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroupId(g.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    activeGroupId === g.id
                      ? "bg-brand text-ink shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-ink">
                  {activeGroup?.name ?? "Qrup"} — Cədvəl
                </h3>
              </div>
              {standingsLoading ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  Cədvəl yüklənir...
                </p>
              ) : (
                <StandingsTable rows={standings} />
              )}
            </section>

            <GroupMatchesTabs
              key={activeGroupId ?? "none"}
              liveMatches={liveMatches}
              upcomingMatches={upcomingMatches}
              finishedMatches={finishedMatches}
              onSelect={openSchedule}
              onEnter={enterMatch}
            />
          </div>
          )}
        </div>
      ) : null}

      {isPlayoff ? (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlayoffView("playoff")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  playoffView === "playoff"
                    ? "bg-brand text-ink"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Playoff
              </button>
              {championship.groups.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setPlayoffView("groups")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    playoffView === "groups"
                      ? "bg-brand text-ink"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  Qrup mərhələsi
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPlayoffView("stats")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  playoffView === "stats"
                    ? "bg-brand text-ink"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Statistika
              </button>
            </div>

          {playoffView === "stats" ? (
            <ChampionshipStatsBlock players={scorerRows} />
          ) : playoffView === "groups" && championship.groups.length > 0 ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {championship.groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGroupId(g.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      activeGroupId === g.id
                        ? "bg-brand text-ink shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-ink">
                    {activeGroup?.name ?? "Qrup"} — Cədvəl
                  </h3>
                </div>
                {standingsLoading ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    Cədvəl yüklənir...
                  </p>
                ) : (
                  <StandingsTable rows={standings} />
                )}
              </section>
              <MatchListSection
                title="Bitmiş oyunlar"
                matches={finishedMatches}
                onSelect={openSchedule}
                onEnter={enterMatch}
              />
            </div>
          ) : (
            <div className="min-w-0 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {playoffStatCards.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <stat.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-lg font-black tabular-nums text-ink">
                        {stat.value}
                      </p>
                      <p className="text-xs font-semibold text-slate-400">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {playoffStageTabs.map((tab) => {
                  const active = activePlayoffTab === tab;
                  const label =
                    tab === "overview" ? "Ümumi baxış" : STAGE_LABEL[tab];
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPlayoffBoardTab(tab)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {tab === "overview" ? (
                        <Trophy className="h-3.5 w-3.5" />
                      ) : null}
                      {label}
                    </button>
                  );
                })}
              </div>

              {playoffMatches.length === 0 &&
              visiblePlayoffStages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                  <Trophy className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm text-slate-500">Playoff oyunu yoxdur.</p>
                </div>
              ) : activePlayoffTab === "overview" ? (
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <h3 className="text-sm font-bold text-ink">
                      Turnir mərhələləri
                    </h3>
                  </div>
                  <div className="overflow-x-auto px-4 py-5">
                    <div className="flex items-stretch gap-1">
                      {visiblePlayoffStages.map((stage, index) => (
                        <PlayoffStageColumn
                          key={stage}
                          stage={stage}
                          matches={playoffByStage.get(stage) ?? []}
                          placeholders={
                            playoffPlaceholderMap.get(stage) ?? []
                          }
                          onSelect={openSchedule}
                          onEnter={enterMatch}
                          showConnector={
                            index < visiblePlayoffStages.length - 1
                          }
                        />
                      ))}
                    </div>
                  </div>
                </section>
              ) : (
                <section className="mx-auto w-full max-w-xl space-y-3">
                  {focusedPlayoffMatches.map((match) => (
                    <PlayoffMatchCard
                      key={match.id}
                      match={match}
                      onSelect={openSchedule}
                      onEnter={enterMatch}
                    />
                  ))}
                  {focusedPlayoffPlaceholders.map((item) => (
                    <PlayoffPlaceholderCard key={item.key} item={item} />
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      ) : null}

      <AdminModal
        open={scheduleMatch != null}
        title="Oyun vaxtı və məkan"
        onClose={() => setScheduleMatch(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setScheduleMatch(null)}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Yadda saxla"
              loading={modalSubmitting}
              formId="schedule-match"
              disabled={!scheduleAt.trim() || !scheduleVenue.trim()}
            />
          </>
        }
      >
        <ModalForm id="schedule-match" onSubmit={(e) => void handleSaveSchedule(e)}>
          {scheduleMatch ? (
            <p className="mb-3 text-sm font-semibold text-ink">
              {scheduleMatch.homeTeam.name} — {scheduleMatch.awayTeam.name}
            </p>
          ) : null}
          <Field label="Oyun vaxtı" required>
            <input
              type="datetime-local"
              className={inputClass}
              value={scheduleAt}
              min={minKickoffLocal()}
              onChange={(e) => setScheduleAt(e.target.value)}
              required
            />
          </Field>
          <Field label="Stadion / məkan" required>
            <input
              className={inputClass}
              value={scheduleVenue}
              onChange={(e) => setScheduleVenue(e.target.value)}
              placeholder="Tofiq Bəhramov stadionu"
              required
            />
          </Field>
          {modalError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={addTeamModalOpen}
        title="Komandanı dəvət et"
        onClose={closeAddTeamModal}
        footer={
          <>
            <ModalCancelButton
              onClick={closeAddTeamModal}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Dəvət göndər"
              loading={modalSubmitting}
              formId="add-champ-team"
            />
          </>
        }
      >
        <ModalForm id="add-champ-team" onSubmit={handleAddTeam}>
          <p className="mb-3 text-xs text-slate-500">
            Dəvət komandanın kapitanına gedəcək. Qəbul etdikdən sonra komandanı
            qrupa əlavə edə bilərsiniz.
          </p>
          <div className="mb-4">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Komanda <span className="text-rose-500">*</span>
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9 pr-9`}
                value={teamSearch}
                onChange={(e) => {
                  setTeamSearch(e.target.value);
                  setPickerTeamId("");
                  setModalError(null);
                }}
                placeholder="Komanda adını yazın..."
                autoComplete="off"
                autoFocus
              />
              {teamSearchLoading ? (
                <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
              ) : teamSearch ? (
                <button
                  type="button"
                  aria-label="Təmizlə"
                  onClick={() => {
                    setTeamSearch("");
                    setPickerTeamId("");
                    setAllTeams([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {teamSearch.trim().length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                Hərf yazdıqca komandalar axtarılacaq
              </p>
            ) : (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
              {teamSearchLoading && allTeams.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Axtarılır...
                </div>
              ) : allTeams.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">
                  Nəticə tapılmadı
                </p>
              ) : (
                <ul className="max-h-64 overflow-y-auto py-1">
                  {allTeams.map((team) => {
                    const enrolled = enrolledTeamIds.has(team.id);
                    const pending = pendingTeamIds.has(team.id);
                    const unavailable = enrolled || pending;
                    const selected = pickerTeamId === team.id;
                    const subtitle = [
                      team.city,
                      team.captain ? `@${team.captain.username}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    const statusNote = enrolled
                      ? "Bu komanda artıq çempionatdadır"
                      : pending
                        ? "Bu komanda dəvət gözləyir"
                        : null;
                    const rowClass = `flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                      unavailable
                        ? "cursor-default opacity-70"
                        : selected
                          ? "bg-brand/20"
                          : "hover:bg-slate-50"
                    }`;
                    const content = (
                      <>
                        {team.logo ? (
                          <img
                            src={mediaUrl(team.logo)}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${teamInitialTone(team.name)}`}>
                            {team.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {team.name}
                          </span>
                          {subtitle ? (
                            <span className="block truncate text-xs text-slate-500">
                              {subtitle}
                            </span>
                          ) : null}
                          {statusNote ? (
                            <span className="mt-0.5 block text-[11px] font-medium text-amber-600">
                              {statusNote}
                            </span>
                          ) : null}
                        </span>
                        {selected && !unavailable ? (
                          <Check className="h-4 w-4 shrink-0 text-brand-dark" />
                        ) : null}
                      </>
                    );
                    return (
                      <li key={team.id}>
                        {unavailable ? (
                          <div className={rowClass}>{content}</div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPickerTeamId(team.id);
                              setModalError(null);
                            }}
                            className={`${rowClass} transition`}
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            )}
          </div>
          {modalError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={groupsModalOpen}
        title="Qrup yarat"
        onClose={() => setGroupsModalOpen(false)}
        size="lg"
        footer={
          <>
            <ModalCancelButton
              onClick={() => setGroupsModalOpen(false)}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Yarat"
              loading={modalSubmitting}
              formId="create-groups"
            />
          </>
        }
      >
        <ModalForm id="create-groups" onSubmit={handleCreateGroups}>
          <p className="mb-3 text-xs text-slate-500">
            Komanda sayı: {championship.teams.length}. Qrup sayi 2–4, tutum 3–7.
          </p>
          <Field label="Qrup sayı" required>
            <select
              className={inputClass}
              value={groupCount}
              onChange={(e) => setGroupCount(e.target.value)}
              required
            >
              {Array.from(
                { length: GROUP_COUNT_MAX - GROUP_COUNT_MIN + 1 },
                (_, i) => GROUP_COUNT_MIN + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Slot rejimi">
            <select
              className={inputClass}
              value={slotMode}
              onChange={(e) => setSlotMode(e.target.value as SlotMode)}
            >
              <option value="same">Hər qrupda eyni</option>
              <option value="perGroup">Qrup üzrə</option>
            </select>
          </Field>
          {slotMode === "same" ? (
            <Field label="Qrup tutumu" required>
              <select
                className={inputClass}
                value={sameSlots}
                onChange={(e) => setSameSlots(e.target.value)}
              >
                {Array.from(
                  { length: GROUP_CAPACITY_MAX - GROUP_CAPACITY_MIN + 1 },
                  (_, i) => GROUP_CAPACITY_MIN + i,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n} komanda
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {slotMode === "perGroup" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {perGroupSlots.map((val, i) => (
                <Field
                  key={i}
                  label={`Qrup ${String.fromCharCode(65 + i)} tutumu`}
                  required
                >
                  <select
                    className={inputClass}
                    value={val}
                    onChange={(e) => {
                      const next = [...perGroupSlots];
                      next[i] = e.target.value;
                      setPerGroupSlots(next);
                    }}
                  >
                    {Array.from(
                      { length: GROUP_CAPACITY_MAX - GROUP_CAPACITY_MIN + 1 },
                      (_, i2) => GROUP_CAPACITY_MIN + i2,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n} komanda
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="rounded border-slate-300"
            />
            Komandaları avtomatik, təsadüfi payla
          </label>
          {groupsSlotError ? (
            <p className="text-sm font-medium text-rose-600">{groupsSlotError}</p>
          ) : null}
          {modalError && modalError !== groupsSlotError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={addToGroupModal != null}
        title={`${addToGroupModal?.name ?? "Qrup"} — komanda əlavə et`}
        onClose={() => setAddToGroupModal(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setAddToGroupModal(null)}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Əlavə et"
              loading={modalSubmitting}
              formId="add-to-group"
            />
          </>
        }
      >
        <ModalForm id="add-to-group" onSubmit={handleAddToGroup}>
          <p className="mb-3 text-xs text-slate-500">
            Yalnız dəvəti qəbul etmiş komandalar qrupa əlavə oluna bilər.
          </p>
          <Field label="Komanda" required>
            <select
              className={inputClass}
              value={addToGroupTeamId}
              onChange={(e) =>
                setAddToGroupTeamId(
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              required
            >
              <option value="">Seçin...</option>
              {unassignedChampTeams.map((row) => (
                <option key={row.teamId} value={row.teamId}>
                  {row.team.name}
                </option>
              ))}
            </select>
          </Field>
          {unassignedChampTeams.length === 0 ? (
            <p className="text-sm text-slate-500">
              Bütün çempionat komandaları artıq qruplardadır və ya siyahı boşdur.
            </p>
          ) : null}
          {modalError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={editGroupModal != null}
        title="Qrupu redaktə et"
        onClose={() => setEditGroupModal(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setEditGroupModal(null)}
              disabled={modalSubmitting}
            />
            <ModalSubmitButton
              label="Yadda saxla"
              loading={modalSubmitting}
              formId="edit-group"
            />
          </>
        }
      >
        <ModalForm id="edit-group" onSubmit={handleEditGroup}>
          <Field label="Ad" required>
            <input
              className={inputClass}
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              required
            />
          </Field>
          <Field label="Qrup tutumu" required>
            <select
              className={inputClass}
              value={editGroupSlots}
              onChange={(e) => setEditGroupSlots(e.target.value)}
              required
            >
              {Array.from(
                { length: GROUP_CAPACITY_MAX - GROUP_CAPACITY_MIN + 1 },
                (_, i) => GROUP_CAPACITY_MIN + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} komanda
                </option>
              ))}
            </select>
          </Field>
          {modalError ? (
            <p className="text-sm font-medium text-rose-600">{modalError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>

      <AdminModal
        open={tieGroups != null}
        title="Playoff bərabərliyi"
        onClose={() => setTieGroups(null)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setTieGroups(null)}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={submitTieBreak}
              className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Sıralamanı təsdiq et
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          Bütün statistikalar eynidir. Yuxarıdakı komanda daha yüksək seed alır.
        </p>
        {tieGroups?.map((group) => {
          const order = tieOrders[group.id] ?? group.teams.map((t) => t.teamId);
          return (
            <div key={group.id} className="mb-4">
              <p className="mb-2 text-sm font-bold text-ink">{group.title}</p>
              <ul className="space-y-1.5">
                {order.map((teamId, index) => {
                  const team = group.teams.find((t) => t.teamId === teamId);
                  if (!team) return null;
                  return (
                    <li
                      key={teamId}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {index + 1}. {team.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {team.points} xal · TF {team.goalDiff} ·{" "}
                          {team.goalsFor} qol · {team.won} qələbə
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveTieTeam(group.id, index, -1)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === order.length - 1}
                          onClick={() => moveTieTeam(group.id, index, 1)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </AdminModal>

      <AdminModal
        open={removeTarget != null}
        title="Komandanı sil"
        onClose={closeRemoveModal}
        footer={
          <>
            <ModalCancelButton
              onClick={closeRemoveModal}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRemoveTeam()}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {busy ? "Gözləyin..." : "Sil"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-ink">{removeTarget?.name}</span>{" "}
          komandasını silməyə əminsiniz?
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {removeTarget?.kind === "invite"
            ? "Dəvət ləğv olunacaq."
            : "Komanda çempionatdan çıxarılacaq, sistemdən silinməyəcək."}
        </p>
        {removeError ? (
          <p className="mt-3 text-sm font-medium text-rose-600">{removeError}</p>
        ) : null}
      </AdminModal>

      <AdminModal
        open={deleteGroupTarget != null}
        title="Qrupu sil"
        onClose={closeDeleteGroupModal}
        footer={
          <>
            <ModalCancelButton
              onClick={closeDeleteGroupModal}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDeleteGroup()}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {busy ? "Gözləyin..." : "Sil"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-ink">
            {deleteGroupTarget?.name}
          </span>{" "}
          qrupunu silməyə əminsiniz?
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Qrupdakı komandalar çempionatda qalacaq, yalnız qrup silinəcək.
        </p>
        {deleteGroupError ? (
          <p className="mt-3 text-sm font-medium text-rose-600">
            {deleteGroupError}
          </p>
        ) : null}
      </AdminModal>
    </AdminPageShell>
  );
}

