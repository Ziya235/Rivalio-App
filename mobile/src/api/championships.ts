import type {
  Championship,
  ChampionshipGroup,
  ChampionshipJoinRequest,
  ChampionshipPlayerStat,
  ChampionshipStatistics,
  CreateChampionshipPayload,
  CreateGroupsPayload,
  GroupStandingsBlock,
} from "../types/championship";
import type { Visibility } from "../types/common";
import type { Match } from "../types/match";
import { api } from "./client";

function normalizeStatistics(
  data: ChampionshipStatistics | ChampionshipPlayerStat[] | null | undefined,
): ChampionshipStatistics {
  if (Array.isArray(data)) return { players: data };
  return { players: Array.isArray(data?.players) ? data.players : [] };
}

/** User-facing, visibility-checked routes (/api/championships/public/*). */
export const championshipsApi = {
  list(opts: { includeAll?: boolean } = {}) {
    return api.get<Championship[]>("/api/championships/public", {
      params: { includeAll: opts.includeAll ? "true" : undefined },
    });
  },
  get(id: number) {
    return api.get<Championship>(`/api/championships/public/${id}`);
  },
  standings(id: number) {
    return api.get<GroupStandingsBlock[]>(`/api/championships/public/${id}/standings`);
  },
  matches(id: number) {
    return api.get<Match[]>(`/api/championships/public/${id}/matches`);
  },
  async statistics(id: number) {
    return normalizeStatistics(
      await api.get<ChampionshipStatistics | ChampionshipPlayerStat[]>(
        `/api/championships/public/${id}/statistics`,
      ),
    );
  },
  requestJoin(id: number, teamId: number) {
    return api.post<unknown>(`/api/championships/${id}/join-requests`, { teamId });
  },
  cancelJoinRequest(requestId: number) {
    return api.post<unknown>(`/api/championship-join-requests/${requestId}/cancel`);
  },
  respondInvite(inviteId: number, action: "accept" | "reject") {
    return api.post<unknown>(`/api/championship-invites/${inviteId}/respond`, { action });
  },
};

/** Admin management of own championships (ADMIN + football_* permissions on the backend). */
export const adminChampionshipsApi = {
  list() {
    return api.get<Championship[]>("/api/championships");
  },
  get(id: number) {
    return api.get<Championship>(`/api/championships/${id}`);
  },
  create(payload: CreateChampionshipPayload) {
    return api.post<Championship>("/api/championships", payload);
  },
  setVisibility(id: number, visibility: Visibility) {
    return api.patch<Championship>(`/api/championships/${id}`, { visibility });
  },
  finish(id: number) {
    return api.post<Championship>(`/api/championships/${id}/finish`, {});
  },
  startGroupStage(id: number) {
    return api.post<Championship>(`/api/championships/${id}/start-group-stage`, {});
  },
  startPlayoff(id: number, payload: { playoffOnly: boolean; tieBreakTeamIds?: number[] }) {
    return api.post<unknown>(`/api/championships/${id}/start-playoff`, payload);
  },
  addTeam(id: number, teamId: number) {
    return api.post<Championship>(`/api/championships/${id}/teams`, { teamId });
  },
  removeTeam(id: number, teamId: number) {
    return api.delete<Championship>(`/api/championships/${id}/teams/${teamId}`);
  },
  cancelInvite(id: number, inviteId: number) {
    return api.delete<Championship>(`/api/championships/${id}/team-invites/${inviteId}`);
  },
  joinRequests(id: number) {
    return api.get<ChampionshipJoinRequest[]>(`/api/championships/${id}/join-requests`);
  },
  respondJoinRequest(requestId: number, action: "accept" | "reject") {
    return api.post<ChampionshipJoinRequest>(
      `/api/championship-join-requests/${requestId}/respond`,
      { action },
    );
  },
  createGroups(id: number, payload: CreateGroupsPayload) {
    return api.post<ChampionshipGroup[]>(`/api/championships/${id}/groups`, payload);
  },
  updateGroup(groupId: number, payload: { name?: string; teamSlots?: number }) {
    return api.patch<ChampionshipGroup>(`/api/championships/groups/${groupId}`, payload);
  },
  deleteGroup(groupId: number) {
    return api.delete<void>(`/api/championships/groups/${groupId}`);
  },
  addTeamToGroup(groupId: number, teamId: number) {
    return api.post<ChampionshipGroup>(`/api/championships/groups/${groupId}/teams`, { teamId });
  },
  removeTeamFromGroup(groupId: number, teamId: number) {
    return api.delete<ChampionshipGroup>(`/api/championships/groups/${groupId}/teams/${teamId}`);
  },
  matches(id: number) {
    return api.get<Match[]>(`/api/championships/${id}/matches`);
  },
  standings(id: number) {
    return api.get<GroupStandingsBlock[]>(`/api/championships/${id}/standings`);
  },
  async statistics(id: number) {
    return normalizeStatistics(
      await api.get<ChampionshipStatistics | ChampionshipPlayerStat[]>(
        `/api/championships/${id}/statistics`,
      ),
    );
  },
};
