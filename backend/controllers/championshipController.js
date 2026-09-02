import {
  addTeamToChampionship,
  addTeamToGroup,
  createChampionship,
  createChampionshipMatch,
  createGroups,
  deleteChampionship,
  deleteChampionshipMatch,
  deleteGroup,
  generateGroupMatches,
  getChampionship,
  getChampionshipMatch,
  getChampionshipStandings,
  getGroupStandings,
  listChampionshipMatches,
  listChampionships,
  listChampionshipTeams,
  listGroups,
  removeTeamFromChampionship,
  removeTeamFromGroup,
  setMatchResult,
  startGroupStage,
  startPlayoff,
  transitionChampionshipStatus,
  updateChampionship,
  updateChampionshipMatchAndAdvance,
  updateGroup,
} from "../services/championshipService.js";

function handleServiceError(res, error) {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
    ...(error.code ? { code: error.code } : {}),
    ...(error.ties ? { ties: error.ties } : {}),
  });
}

export const listChampionshipsHandler = async (req, res) => {
  try {
    const data = await listChampionships(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in listChampionships:", error);
    return handleServiceError(res, error);
  }
};

export const getChampionshipHandler = async (req, res) => {
  try {
    const data = await getChampionship(req.params.championshipId, req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in getChampionship:", error);
    return handleServiceError(res, error);
  }
};

export const createChampionshipHandler = async (req, res) => {
  try {
    const data = await createChampionship(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: "Championship created successfully",
      data,
    });
  } catch (error) {
    console.log("Error in createChampionship:", error);
    return handleServiceError(res, error);
  }
};

export const updateChampionshipHandler = async (req, res) => {
  try {
    const data = await updateChampionship(
      req.params.championshipId,
      req.user.id,
      req.body,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in updateChampionship:", error);
    return handleServiceError(res, error);
  }
};

export const deleteChampionshipHandler = async (req, res) => {
  try {
    await deleteChampionship(req.params.championshipId, req.user.id);
    return res.json({ success: true, message: "Championship deleted" });
  } catch (error) {
    console.log("Error in deleteChampionship:", error);
    return handleServiceError(res, error);
  }
};

export const transitionStatusHandler = async (req, res) => {
  try {
    const { status } = req.body;
    const data = await transitionChampionshipStatus(
      req.params.championshipId,
      req.user.id,
      status,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in transitionStatus:", error);
    return handleServiceError(res, error);
  }
};

export const startGroupStageHandler = async (req, res) => {
  try {
    const data = await startGroupStage(req.params.championshipId, req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in startGroupStage:", error);
    return handleServiceError(res, error);
  }
};

export const listTeamsHandler = async (req, res) => {
  try {
    const data = await listChampionshipTeams(
      req.params.championshipId,
      req.user.id,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in listChampionshipTeams:", error);
    return handleServiceError(res, error);
  }
};

export const addTeamHandler = async (req, res) => {
  try {
    const data = await addTeamToChampionship(
      req.params.championshipId,
      req.user.id,
      req.body.teamId,
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.log("Error in addTeam:", error);
    return handleServiceError(res, error);
  }
};

export const removeTeamHandler = async (req, res) => {
  try {
    const data = await removeTeamFromChampionship(
      req.params.championshipId,
      req.user.id,
      req.params.teamId,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in removeTeam:", error);
    return handleServiceError(res, error);
  }
};

export const createGroupsHandler = async (req, res) => {
  try {
    const data = await createGroups(
      req.params.championshipId,
      req.user.id,
      req.body,
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.log("Error in createGroups:", error);
    return handleServiceError(res, error);
  }
};

export const listGroupsHandler = async (req, res) => {
  try {
    const data = await listGroups(req.params.championshipId, req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in listGroups:", error);
    return handleServiceError(res, error);
  }
};

export const updateGroupHandler = async (req, res) => {
  try {
    const data = await updateGroup(req.params.groupId, req.user.id, req.body);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in updateGroup:", error);
    return handleServiceError(res, error);
  }
};

export const deleteGroupHandler = async (req, res) => {
  try {
    await deleteGroup(req.params.groupId, req.user.id);
    return res.json({ success: true, message: "Group deleted" });
  } catch (error) {
    console.log("Error in deleteGroup:", error);
    return handleServiceError(res, error);
  }
};

export const addGroupTeamHandler = async (req, res) => {
  try {
    const data = await addTeamToGroup(
      req.params.groupId,
      req.user.id,
      req.body.teamId,
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.log("Error in addGroupTeam:", error);
    return handleServiceError(res, error);
  }
};

export const removeGroupTeamHandler = async (req, res) => {
  try {
    const data = await removeTeamFromGroup(
      req.params.groupId,
      req.user.id,
      req.params.teamId,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in removeGroupTeam:", error);
    return handleServiceError(res, error);
  }
};

export const generateMatchesHandler = async (req, res) => {
  try {
    const data = await generateGroupMatches(
      req.params.championshipId,
      req.user.id,
      req.body || {},
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.log("Error in generateMatches:", error);
    return handleServiceError(res, error);
  }
};

export const listMatchesHandler = async (req, res) => {
  try {
    const data = await listChampionshipMatches(
      req.params.championshipId,
      req.user.id,
      req.query,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in listMatches:", error);
    return handleServiceError(res, error);
  }
};

export const createMatchHandler = async (req, res) => {
  try {
    const data = await createChampionshipMatch(
      req.params.championshipId,
      req.user.id,
      req.body,
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.log("Error in createMatch:", error);
    return handleServiceError(res, error);
  }
};

export const getMatchHandler = async (req, res) => {
  try {
    const data = await getChampionshipMatch(req.params.matchId, req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in getMatch:", error);
    return handleServiceError(res, error);
  }
};

export const updateMatchHandler = async (req, res) => {
  try {
    const data = await updateChampionshipMatchAndAdvance(
      req.params.matchId,
      req.user.id,
      req.body,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in updateMatch:", error);
    return handleServiceError(res, error);
  }
};

export const setMatchResultHandler = async (req, res) => {
  try {
    const data = await setMatchResult(req.params.matchId, req.user.id, req.body);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in setMatchResult:", error);
    return handleServiceError(res, error);
  }
};

export const deleteMatchHandler = async (req, res) => {
  try {
    await deleteChampionshipMatch(req.params.matchId, req.user.id);
    return res.json({ success: true, message: "Match deleted" });
  } catch (error) {
    console.log("Error in deleteMatch:", error);
    return handleServiceError(res, error);
  }
};

export const groupStandingsHandler = async (req, res) => {
  try {
    const data = await getGroupStandings(req.params.groupId, req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in groupStandings:", error);
    return handleServiceError(res, error);
  }
};

export const championshipStandingsHandler = async (req, res) => {
  try {
    const data = await getChampionshipStandings(
      req.params.championshipId,
      req.user.id,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in championshipStandings:", error);
    return handleServiceError(res, error);
  }
};

export const startPlayoffHandler = async (req, res) => {
  try {
    const data = await startPlayoff(req.params.championshipId, req.user.id, {
      playoffOnly: Boolean(req.body?.playoffOnly),
      tieBreakTeamIds: req.body?.tieBreakTeamIds,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.log("Error in startPlayoff:", error);
    return handleServiceError(res, error);
  }
};
