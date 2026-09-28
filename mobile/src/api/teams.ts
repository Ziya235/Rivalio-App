import type { RequestStatus } from "../types/common";
import type {
  CreateTeamPayload,
  IncomingOutcomes,
  TeamDetail,
  TeamPlayerInvite,
  TeamSummary,
} from "../types/team";
import { api } from "./client";

type Action = "accept" | "reject";

export const teamsApi = {
  list(params: { mine?: boolean; q?: string } = {}, signal?: AbortSignal) {
    return api.get<TeamSummary[]>("/api/teams", {
      params: { mine: params.mine ? "true" : undefined, q: params.q || undefined },
      signal,
    });
  },
  get(teamId: number) {
    return api.get<TeamDetail>(`/api/teams/${teamId}`);
  },
  create(payload: CreateTeamPayload) {
    return api.post<TeamDetail>("/api/teams", payload);
  },
  invitePlayer(teamId: number, payload: { username: string; message?: string }) {
    return api.post<TeamPlayerInvite>(`/api/teams/${teamId}/player-invites`, payload);
  },
  removePlayer(teamId: number, playerId: number) {
    return api.delete<void>(`/api/teams/${teamId}/players/${playerId}`);
  },
  playerInviteNotifications() {
    return api.get<IncomingOutcomes<TeamPlayerInvite>>("/api/me/team-player-invite-notifications");
  },
  respondPlayerInvite(inviteId: number, action: Action) {
    return api.post<TeamPlayerInvite>(`/api/team-player-invites/${inviteId}/respond`, { action });
  },

  // League invitations addressed to a team captain / join requests sent by one.
  respondLeagueInvite(inviteId: number, action: Action) {
    return api.post<{ id: number; status: RequestStatus }>(
      `/api/team-invites/${inviteId}/respond`,
      { action },
    );
  },
  requestJoinLeague(leagueId: number, teamId: number) {
    return api.post<unknown>(`/api/leagues/${leagueId}/join-requests`, { teamId });
  },
  cancelLeagueJoinRequest(requestId: number) {
    return api.post<unknown>(`/api/league-join-requests/${requestId}/cancel`);
  },
};
