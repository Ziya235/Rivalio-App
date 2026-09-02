import {
  getVisibleChampionship,
  getVisibleChampionshipMatch,
  getVisibleChampionshipStandings,
  getVisibleChampionshipStatistics,
  listVisibleChampionshipMatches,
  listVisibleChampionships,
} from "../services/championshipService.js";

function handleServiceError(res, error) {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export const listVisibleChampionshipsHandler = async (req, res) => {
  try {
    const data = await listVisibleChampionships(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in listVisibleChampionships:", error);
    return handleServiceError(res, error);
  }
};

export const getVisibleChampionshipHandler = async (req, res) => {
  try {
    const data = await getVisibleChampionship(
      req.params.championshipId,
      req.user.id,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in getVisibleChampionship:", error);
    return handleServiceError(res, error);
  }
};

export const getVisibleStandingsHandler = async (req, res) => {
  try {
    const data = await getVisibleChampionshipStandings(
      req.params.championshipId,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in getVisibleChampionshipStandings:", error);
    return handleServiceError(res, error);
  }
};

export const listVisibleMatchesHandler = async (req, res) => {
  try {
    const data = await listVisibleChampionshipMatches(
      req.params.championshipId,
      req.query,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in listVisibleChampionshipMatches:", error);
    return handleServiceError(res, error);
  }
};

export const getVisibleMatchHandler = async (req, res) => {
  try {
    const data = await getVisibleChampionshipMatch(req.params.matchId);
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in getVisibleChampionshipMatch:", error);
    return handleServiceError(res, error);
  }
};

export const getVisibleStatisticsHandler = async (req, res) => {
  try {
    const data = await getVisibleChampionshipStatistics(
      req.params.championshipId,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in getVisibleChampionshipStatistics:", error);
    return handleServiceError(res, error);
  }
};
