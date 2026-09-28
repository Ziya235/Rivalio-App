import type { Match, MatchEvent, MatchEventPayload, UpdateMatchPayload } from "../types/match";
import { api } from "./client";

export const matchesApi = {
  /** League match (and admin view of any own match). */
  get(matchId: number) {
    return api.get<Match>(`/api/matches/${matchId}`);
  },
  /** Championship match through the visibility-checked public route. */
  getChampionshipMatch(matchId: number) {
    return api.get<Match>(`/api/championships/public/matches/${matchId}`);
  },
};

/** Admin match control. Status transitions and edit windows are enforced by the backend. */
export const adminMatchesApi = {
  update(matchId: number, payload: UpdateMatchPayload) {
    return api.patch<Match>(`/api/matches/${matchId}`, payload);
  },
  updateChampionshipMatch(matchId: number, payload: UpdateMatchPayload) {
    return api.patch<Match>(`/api/championships/matches/${matchId}`, payload);
  },
  addEvent(matchId: number, payload: MatchEventPayload) {
    return api.post<{ event: MatchEvent; match: Match }>(`/api/matches/${matchId}/events`, payload);
  },
  updateEvent(matchId: number, eventId: number, payload: MatchEventPayload) {
    return api.patch<{ event: MatchEvent; match: Match }>(
      `/api/matches/${matchId}/events/${eventId}`,
      payload,
    );
  },
  deleteEvent(matchId: number, eventId: number) {
    return api.delete<Match>(`/api/matches/${matchId}/events/${eventId}`);
  },
};
