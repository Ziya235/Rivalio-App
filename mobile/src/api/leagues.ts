import type {
  CreateLeaguePayload,
  League,
  LeagueInvite,
  LeagueJoinRequest,
  LeaguePlayerRow,
  LeagueStandingsResponse,
  LeagueTeamDetail,
} from "../types/league";
import type { MatchFormat } from "../types/common";
import type { Match } from "../types/match";
import { api } from "./client";

export const leaguesApi = {
  /** includeAll=true returns private leagues too (with canView=false when locked). */
  list(opts: { includeAll?: boolean } = {}) {
    return api.get<League[]>("/api/leagues", {
      params: { includeAll: opts.includeAll ? "true" : undefined },
    });
  },
  get(leagueId: number) {
    return api.get<League>(`/api/leagues/${leagueId}`);
  },
  standings(leagueId: number) {
    return api.get<LeagueStandingsResponse>(`/api/leagues/${leagueId}/standings`);
  },
  players(leagueId: number) {
    return api.get<LeaguePlayerRow[]>(`/api/leagues/${leagueId}/players`);
  },
  matches(leagueId: number) {
    return api.get<Match[]>(`/api/leagues/${leagueId}/matches`);
  },
  team(leagueId: number, teamId: number) {
    return api.get<LeagueTeamDetail>(`/api/leagues/${leagueId}/teams/${teamId}`);
  },
};

/** Admin-only league management (backend enforces ADMIN + football_* permissions). */
export const adminLeaguesApi = {
  create(payload: CreateLeaguePayload) {
    return api.post<League>("/api/leagues", payload);
  },
  start(leagueId: number, matchFormat: MatchFormat) {
    return api.post<League>(`/api/leagues/${leagueId}/start`, { matchFormat });
  },
  finish(leagueId: number) {
    return api.post<League>(`/api/leagues/${leagueId}/finish`, {});
  },
  invites(leagueId: number) {
    return api.get<LeagueInvite[]>(`/api/leagues/${leagueId}/team-invites`);
  },
  inviteTeam(leagueId: number, payload: { teamId: number; message?: string }) {
    return api.post<LeagueInvite>(`/api/leagues/${leagueId}/team-invites`, payload);
  },
  cancelInvite(leagueId: number, inviteId: number) {
    return api.delete<LeagueInvite>(`/api/leagues/${leagueId}/team-invites/${inviteId}`);
  },
  joinRequests(leagueId: number) {
    return api.get<LeagueJoinRequest[]>(`/api/leagues/${leagueId}/join-requests`);
  },
  respondJoinRequest(requestId: number, action: "accept" | "reject") {
    return api.post<LeagueJoinRequest>(`/api/league-join-requests/${requestId}/respond`, {
      action,
    });
  },
  removeTeam(leagueId: number, teamId: number) {
    return api.delete<void>(`/api/leagues/${leagueId}/teams/${teamId}`);
  },
  /** GET /api/matches/mine — the admin's own league matches (with edit policy fields). */
  matches(leagueId: number) {
    return api.get<Match[]>("/api/matches/mine", { params: { leagueId } });
  },
};
