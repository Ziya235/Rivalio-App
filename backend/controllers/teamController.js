/**
 * Admin team routes now go through league invites / remove-from-league.
 * Kept file so imports don't break — re-export remove handler.
 */
export { removeTeamFromLeague as deleteTeam } from "./leagueRequestController.js";
