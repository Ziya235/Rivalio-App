import type { AppNotification } from "../types/notification";
import type { ChallengeRequestNotice, PlayerSearchRequestNotice } from "../types/social";
import type { TeamPlayerInvite } from "../types/team";
import { fullName } from "./format";

// Wording ported from frontend/src/lib/notificationDisplay.ts.

const isPending = (s: string | null | undefined) => s === "PENDING" || s == null;

export type MessagePart = { text: string; strong?: boolean };

const strong = (text: string): MessagePart => ({ text, strong: true });
const plain = (text: string): MessagePart => ({ text });

export function notificationParts(n: AppNotification): MessagePart[] {
  const actor = n.actor ? fullName(n.actor) : "Rivalio";

  if (n.type === "FRIEND_REQUEST") {
    if (n.friendRequestStatus === "ACCEPTED") return [strong(actor), plain(" dostluq sorğusunu qəbul etdiniz")];
    if (n.friendRequestStatus === "REJECTED") return [strong(actor), plain(" dostluq sorğusunu rədd etdiniz")];
    return [strong(actor), plain(" sizə dostluq sorğusu göndərdi")];
  }
  if (n.type === "FRIEND_ACCEPTED") return [strong(actor), plain(" dostluq sorğunuzu qəbul etdi")];

  const champ =
    n.championshipInvite?.championship.name ?? n.championshipJoinRequest?.championship.name ?? "çempionat";
  const champTeam = n.championshipInvite?.team.name ?? n.championshipJoinRequest?.team.name ?? "Komanda";
  const league = n.leagueInvite?.league.name ?? n.joinRequest?.league.name ?? "liqa";
  const leagueTeam = n.leagueInvite?.team.name ?? n.joinRequest?.team.name ?? "Komanda";

  if (n.type === "CHAMPIONSHIP_INVITE") {
    const s = n.championshipInviteStatus;
    if (s === "ACCEPTED") {
      return [strong(champTeam), plain(" komandası "), strong(champ), plain(" çempionatında iştirak dəvətinizi qəbul etdi.")];
    }
    if (s === "REJECTED") {
      return [strong(champTeam), plain(" komandası "), strong(champ), plain(" çempionatında iştirak dəvətinizi rədd etdi.")];
    }
    if (s === "CANCELLED") return [strong(actor), plain(` ${champ} dəvəti ləğv edildi`)];
    return [strong(actor), plain(" sizi "), strong(champ), plain(" çempionatında iştirak etməyə dəvət etdi.")];
  }
  if (n.type === "LEAGUE_INVITE") {
    const s = n.leagueInviteStatus;
    if (s === "ACCEPTED") {
      return [strong(leagueTeam), plain(" komandası "), strong(league), plain(" liqasında iştirak dəvətinizi qəbul etdi.")];
    }
    if (s === "REJECTED") {
      return [strong(leagueTeam), plain(" komandası "), strong(league), plain(" liqasında iştirak dəvətinizi rədd etdi.")];
    }
    if (s === "CANCELLED") return [strong(actor), plain(` ${league} dəvəti ləğv edildi`)];
    return [strong(actor), plain(" sizi "), strong(league), plain(" liqasında iştirak etməyə dəvət etdi.")];
  }
  if (n.type === "JOIN_REQUEST") {
    const s = n.joinRequestStatus;
    if (s === "ACCEPTED") {
      return [strong(leagueTeam), plain(" komandasının "), strong(league), plain(" liqasına iştirak təklifi qəbul edildi.")];
    }
    if (s === "REJECTED") {
      return [strong(leagueTeam), plain(" komandasının "), strong(league), plain(" liqasına iştirak təklifi rədd edildi.")];
    }
    if (s === "CANCELLED") return [strong(leagueTeam), plain(` komandası ${league} sorğusunu ləğv etdi`)];
    return [strong(leagueTeam), plain(" komandası "), strong(league), plain(" liqasında iştirak etmək üçün dəvət göndərdi.")];
  }
  if (n.type === "CHAMPIONSHIP_JOIN_REQUEST") {
    const s = n.championshipJoinRequestStatus;
    if (s === "ACCEPTED") {
      return [strong(champTeam), plain(" komandasının "), strong(champ), plain(" çempionatına iştirak təklifi qəbul edildi.")];
    }
    if (s === "REJECTED") {
      return [strong(champTeam), plain(" komandasının "), strong(champ), plain(" çempionatına iştirak təklifi rədd edildi.")];
    }
    if (s === "CANCELLED") return [strong(champTeam), plain(` komandası ${champ} sorğusunu ləğv etdi`)];
    return [strong(champTeam), plain(" komandası "), strong(champ), plain(" çempionatında iştirak etmək üçün dəvət göndərdi.")];
  }
  if (n.type === "NEW_MESSAGE") return [strong(actor), plain(" yeni mesaj göndərdi")];
  return [strong(actor), plain(" bildiriş göndərdi")];
}

export function playerSearchParts(r: PlayerSearchRequestNotice, incoming: boolean): MessagePart[] {
  const team = r.playerSearch.hostTeam.name;
  if (incoming) {
    const user = fullName(r.user);
    if (r.status === "ACCEPTED") return [strong(user), plain(" oyunçu axtarışı sorğusunu qəbul etdiniz")];
    if (r.status === "REJECTED") return [strong(user), plain(" oyunçu axtarışı sorğusunu rədd etdiniz")];
    return [strong(user), plain(` sizin ${team} komandanızın oyunçu axtarışına qoşulmaq istəyir`)];
  }
  if (r.status === "ACCEPTED") return [strong(team), plain(" oynamaq təklifinizi qəbul etdi.")];
  if (r.status === "CANCELLED") return [strong(team), plain(" oyunçu axtarışını bağladı")];
  return [strong(team), plain(" oynamaq təklifinizi qəbul etmədi.")];
}

export function challengeParts(r: ChallengeRequestNotice, incoming: boolean): MessagePart[] {
  const team = incoming ? r.team.name : r.challenge.team.name;
  if (incoming) {
    if (r.status === "PENDING") return [strong(team), plain(" komandası sizinlə oynamaq üçün dəvət göndərdi.")];
    if (r.status === "ACCEPTED") return [strong(team), plain(" oyun təklifi sorğusunu qəbul etdiniz")];
    if (r.status === "REJECTED") return [strong(team), plain(" oyun təklifi sorğusunu rədd etdiniz")];
    return [strong(team), plain(" üçün başqa rəqib seçildi")];
  }
  if (r.status === "ACCEPTED") return [strong(team), plain(" komandası oyun təklifinizi qəbul etdi.")];
  if (r.status === "REJECTED") return [strong(team), plain(" komandası oyun təklifinizi qəbul etmədi.")];
  return [strong(team), plain(" başqa rəqib seçdi")];
}

export function teamPlayerInviteParts(r: TeamPlayerInvite, incoming: boolean): MessagePart[] {
  const team = r.team.name;
  if (incoming) {
    return [strong(fullName(r.invitedBy)), plain(` sizi ${team} komandasına dəvət etdi`)];
  }
  const player = fullName(r.invitedUser);
  if (r.status === "ACCEPTED") {
    return [strong(player), plain(` sizin ${team} komandasına dəvətinizi qəbul etdi`)];
  }
  return [strong(player), plain(` sizin ${team} komandasına dəvətinizi qəbul etmədi`)];
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
