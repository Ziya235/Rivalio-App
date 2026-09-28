import type { IncomingOutcomes } from "../types/team";
import type {
  Challenge,
  ChallengeRequestNotice,
  CreateChallengePayload,
  CreatePlayerSearchPayload,
  PlayerSearch,
  PlayerSearchRequestNotice,
} from "../types/social";
import { api } from "./client";

type Action = "accept" | "reject";

/** "Oyun təklifləri" (backend: challenges). */
export const challengesApi = {
  list() {
    return api.get<Challenge[]>("/api/challenges");
  },
  create(payload: CreateChallengePayload) {
    return api.post<Challenge>("/api/challenges", payload);
  },
  request(challengeId: number, teamId: number) {
    return api.post<unknown>(`/api/challenges/${challengeId}/requests`, { teamId });
  },
  respond(requestId: number, action: Action) {
    return api.post<unknown>(`/api/challenge-requests/${requestId}/respond`, { action });
  },
  cancelRequest(requestId: number) {
    return api.post<unknown>(`/api/challenge-requests/${requestId}/cancel`);
  },
  notifications() {
    return api.get<IncomingOutcomes<ChallengeRequestNotice>>("/api/me/challenge-notifications");
  },
};

/** "Oyunçu axtarışı" (backend: player-searches). */
export const playerSearchApi = {
  list() {
    return api.get<PlayerSearch[]>("/api/player-searches");
  },
  create(payload: CreatePlayerSearchPayload) {
    return api.post<PlayerSearch>("/api/player-searches", payload);
  },
  join(searchId: number) {
    return api.post<unknown>(`/api/player-searches/${searchId}/requests`, {});
  },
  respond(requestId: number, action: Action) {
    return api.post<unknown>(`/api/player-search-requests/${requestId}/respond`, { action });
  },
  cancelRequest(requestId: number) {
    return api.post<unknown>(`/api/player-search-requests/${requestId}/cancel`);
  },
  notifications() {
    return api.get<IncomingOutcomes<PlayerSearchRequestNotice>>(
      "/api/me/player-search-notifications",
    );
  },
};
