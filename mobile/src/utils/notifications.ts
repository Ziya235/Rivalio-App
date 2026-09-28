import type { AppNotification } from "../types/notification";

// Wording ported from frontend/src/lib/notificationDisplay.ts.

const isPending = (s: string | null | undefined) => s === "PENDING" || s == null;

export function notificationText(n: AppNotification): string {
  if (n.type === "FRIEND_REQUEST") {
    if (n.friendRequestStatus === "ACCEPTED") return "dostluq sorğusunu qəbul etdiniz";
    if (n.friendRequestStatus === "REJECTED") return "dostluq sorğusunu rədd etdiniz";
    return "sizə dostluq sorğusu göndərdi";
  }
  if (n.type === "FRIEND_ACCEPTED") return "dostluq sorğunuzu qəbul etdi";

  const champ =
    n.championshipInvite?.championship.name ?? n.championshipJoinRequest?.championship.name ?? "çempionat";
  const champTeam = n.championshipInvite?.team.name ?? n.championshipJoinRequest?.team.name;
  const league = n.leagueInvite?.league.name ?? n.joinRequest?.league.name ?? "liqa";
  const leagueTeam = n.leagueInvite?.team.name ?? n.joinRequest?.team.name;

  if (n.type === "CHAMPIONSHIP_INVITE") {
    const s = n.championshipInviteStatus;
    if (s === "ACCEPTED") return champTeam ? `${champTeam} komandası ${champ} dəvətini qəbul etdi` : `${champ} dəvətini qəbul etdi`;
    if (s === "REJECTED") return champTeam ? `${champTeam} komandası ${champ} dəvətini rədd etdi` : `${champ} dəvətini rədd etdi`;
    if (s === "CANCELLED") return `${champ} dəvəti ləğv edildi`;
    return champTeam
      ? `${champTeam} komandanızı ${champ} çempionatına dəvət etdi`
      : `komandanızı ${champ} çempionatına dəvət etdi`;
  }
  if (n.type === "LEAGUE_INVITE") {
    const s = n.leagueInviteStatus;
    if (s === "ACCEPTED") return leagueTeam ? `${leagueTeam} komandası ${league} dəvətini qəbul etdi` : `${league} dəvətini qəbul etdi`;
    if (s === "REJECTED") return leagueTeam ? `${leagueTeam} komandası ${league} dəvətini rədd etdi` : `${league} dəvətini rədd etdi`;
    if (s === "CANCELLED") return `${league} dəvəti ləğv edildi`;
    return leagueTeam
      ? `${leagueTeam} komandanızı ${league} liqasına dəvət etdi`
      : `komandanızı ${league} liqasına dəvət etdi`;
  }
  if (n.type === "JOIN_REQUEST") {
    const s = n.joinRequestStatus;
    if (s === "ACCEPTED") return leagueTeam ? `${leagueTeam} komandasının ${league} sorğusu qəbul edildi` : `${league} sorğusu qəbul edildi`;
    if (s === "REJECTED") return leagueTeam ? `${leagueTeam} komandasının ${league} sorğusu rədd edildi` : `${league} sorğusu rədd edildi`;
    if (s === "CANCELLED") return leagueTeam ? `${leagueTeam} komandası ${league} sorğusunu ləğv etdi` : `${league} sorğusu ləğv edildi`;
    return `${league} liqasında iştirak etmək üçün sorğu göndərdi`;
  }
  if (n.type === "CHAMPIONSHIP_JOIN_REQUEST") {
    const s = n.championshipJoinRequestStatus;
    if (s === "ACCEPTED") return champTeam ? `${champTeam} komandasının ${champ} sorğusu qəbul edildi` : `${champ} sorğusu qəbul edildi`;
    if (s === "REJECTED") return champTeam ? `${champTeam} komandasının ${champ} sorğusu rədd edildi` : `${champ} sorğusu rədd edildi`;
    if (s === "CANCELLED") return champTeam ? `${champTeam} komandası ${champ} sorğusunu ləğv etdi` : `${champ} sorğusu ləğv edildi`;
    return `${champ} çempionatında iştirak etmək üçün sorğu göndərdi`;
  }
  if (n.type === "NEW_MESSAGE") return "yeni mesaj göndərdi";
  return "bildiriş göndərdi";
}

export type PendingAction =
  | "friend"
  | "championshipInvite"
  | "leagueInvite"
  | "leagueJoin"
  | "championshipJoin"
  | null;

/**
 * Which accept/reject action a notification offers. Join requests are answered
 * by the competition admin, matching the web (backend enforces this too).
 */
export function pendingAction(n: AppNotification, isAdmin: boolean): PendingAction {
  if (n.type === "FRIEND_REQUEST" && isPending(n.friendRequestStatus)) return "friend";
  if (n.type === "CHAMPIONSHIP_INVITE" && isPending(n.championshipInviteStatus)) return "championshipInvite";
  if (n.type === "LEAGUE_INVITE" && isPending(n.leagueInviteStatus)) return "leagueInvite";
  if (isAdmin && n.type === "JOIN_REQUEST" && isPending(n.joinRequestStatus)) return "leagueJoin";
  if (isAdmin && n.type === "CHAMPIONSHIP_JOIN_REQUEST" && isPending(n.championshipJoinRequestStatus)) {
    return "championshipJoin";
  }
  return null;
}

export type Outcome = "accepted" | "rejected" | null;

export function notificationOutcome(n: AppNotification): Outcome {
  const s =
    n.friendRequestStatus ??
    n.championshipInviteStatus ??
    n.leagueInviteStatus ??
    n.joinRequestStatus ??
    n.championshipJoinRequestStatus;
  if (s === "ACCEPTED") return "accepted";
  if (s === "REJECTED" || s === "CANCELLED") return "rejected";
  return null;
}
