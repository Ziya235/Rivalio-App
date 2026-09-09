import { getPlayerGoalStats, getTeamGoalStats, getUserGoalStats } from "./goalStats.js";

/** Career totals across finished league + championship matches. */
export const getTeamLeagueStats = (teamId) => getTeamGoalStats(teamId);

export const getUserLeagueStats = (userId) => getUserGoalStats(userId);

export const getPlayerLeagueStats = (player) => getPlayerGoalStats(player);
