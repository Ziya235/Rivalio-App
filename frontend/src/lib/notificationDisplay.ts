import type { AppNotification } from "../api/notifications";
import type {
  ChallengeNotificationRequest,
  PlayerSearchNotificationRequest,
} from "../api/social";
import type { TeamPlayerInvite } from "../api/teams";

export type MessagePart = { text: string; strong?: boolean };

const strong = (text: string): MessagePart => ({ text, strong: true });
const plain = (text: string): MessagePart => ({ text });

export function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}  ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function personName(person?: {
  firstName?: string;
  lastName?: string;
  username?: string;
} | null) {
  if (!person) return "İstifadəçi";
  const full = `${person.firstName || ""} ${person.lastName || ""}`.trim();
  return full || person.username || "İstifadəçi";
}

export function notificationParts(notification: AppNotification): MessagePart[] {
  const actor = personName(notification.actor);

  if (
    notification.type === "FRIEND_REQUEST" &&
    notification.friendRequestStatus === "ACCEPTED"
  ) {
    return [strong(actor), plain(" dostluq sorğusunu qəbul etdiniz")];
  }
  if (
    notification.type === "FRIEND_REQUEST" &&
    notification.friendRequestStatus === "REJECTED"
  ) {
    return [strong(actor), plain(" dostluq sorğusunu rədd etdiniz")];
  }

  const champName =
    notification.championshipInvite?.championship.name ??
    notification.championshipJoinRequest?.championship.name ??
    "çempionat";
  const teamName =
    notification.championshipInvite?.team.name ??
    notification.championshipJoinRequest?.team.name ??
    "Komanda";
  const leagueName =
    notification.leagueInvite?.league.name ??
    notification.joinRequest?.league.name ??
    "liqa";
  const leagueTeamName =
    notification.leagueInvite?.team.name ??
    notification.joinRequest?.team.name ??
    "Komanda";

  if (notification.type === "CHAMPIONSHIP_INVITE") {
    if (notification.championshipInviteStatus === "ACCEPTED") {
      return [
        strong(teamName),
        plain(" komandası "),
        strong(champName),
        plain(" çempionatında iştirak dəvətinizi qəbul etdi."),
      ];
    }
    if (notification.championshipInviteStatus === "REJECTED") {
      return [
        strong(teamName),
        plain(" komandası "),
        strong(champName),
        plain(" çempionatında iştirak dəvətinizi rədd etdi."),
      ];
    }
    if (notification.championshipInviteStatus === "CANCELLED") {
      return [strong(actor), plain(` ${champName} dəvəti ləğv edildi`)];
    }
    return [
      strong(actor),
      plain(" sizi "),
      strong(champName),
      plain(" çempionatında iştirak etməyə dəvət etdi."),
    ];
  }

  if (notification.type === "LEAGUE_INVITE") {
    if (notification.leagueInviteStatus === "ACCEPTED") {
      return [
        strong(leagueTeamName),
        plain(" komandası "),
        strong(leagueName),
        plain(" liqasında iştirak dəvətinizi qəbul etdi."),
      ];
    }
    if (notification.leagueInviteStatus === "REJECTED") {
      return [
        strong(leagueTeamName),
        plain(" komandası "),
        strong(leagueName),
        plain(" liqasında iştirak dəvətinizi rədd etdi."),
      ];
    }
    if (notification.leagueInviteStatus === "CANCELLED") {
      return [strong(actor), plain(` ${leagueName} dəvəti ləğv edildi`)];
    }
    return [
      strong(actor),
      plain(" sizi "),
      strong(leagueName),
      plain(" liqasında iştirak etməyə dəvət etdi."),
    ];
  }

  if (notification.type === "JOIN_REQUEST") {
    if (notification.joinRequestStatus === "ACCEPTED") {
      return [
        strong(leagueTeamName),
        plain(" komandasının "),
        strong(leagueName),
        plain(" liqasına iştirak təklifi qəbul edildi."),
      ];
    }
    if (notification.joinRequestStatus === "REJECTED") {
      return [
        strong(leagueTeamName),
        plain(" komandasının "),
        strong(leagueName),
        plain(" liqasına iştirak təklifi rədd edildi."),
      ];
    }
    if (notification.joinRequestStatus === "CANCELLED") {
      return [
        strong(leagueTeamName),
        plain(` komandası ${leagueName} sorğusunu ləğv etdi`),
      ];
    }
    return [
      strong(leagueTeamName),
      plain(" komandası "),
      strong(leagueName),
      plain(" liqasında iştirak etmək üçün dəvət göndərdi."),
    ];
  }

  if (notification.type === "CHAMPIONSHIP_JOIN_REQUEST") {
    if (notification.championshipJoinRequestStatus === "ACCEPTED") {
      return [
        strong(teamName),
        plain(" komandasının "),
        strong(champName),
        plain(" çempionatına iştirak təklifi qəbul edildi."),
      ];
    }
    if (notification.championshipJoinRequestStatus === "REJECTED") {
      return [
        strong(teamName),
        plain(" komandasının "),
        strong(champName),
        plain(" çempionatına iştirak təklifi rədd edildi."),
      ];
    }
    if (notification.championshipJoinRequestStatus === "CANCELLED") {
      return [
        strong(teamName),
        plain(` komandası ${champName} sorğusunu ləğv etdi`),
      ];
    }
    return [
      strong(teamName),
      plain(" komandası "),
      strong(champName),
      plain(" çempionatında iştirak etmək üçün dəvət göndərdi."),
    ];
  }

  switch (notification.type) {
    case "FRIEND_REQUEST":
      return [strong(actor), plain(" sizə dostluq sorğusu göndərdi")];
    case "FRIEND_ACCEPTED":
      return [strong(actor), plain(" dostluq sorğunuzu qəbul etdi")];
    case "NEW_MESSAGE":
      return [strong(actor), plain(" yeni mesaj göndərdi")];
    default:
      return [strong(actor), plain(" bildiriş göndərdi")];
  }
}

export function playerSearchParts(
  request: PlayerSearchNotificationRequest,
  incoming: boolean,
): MessagePart[] {
  const team = request.playerSearch.hostTeam.name;
  if (incoming) {
    const user = personName(request.user);
    if (request.status === "ACCEPTED") {
      return [strong(user), plain(" oyunçu axtarışı sorğusunu qəbul etdiniz")];
    }
    if (request.status === "REJECTED") {
      return [strong(user), plain(" oyunçu axtarışı sorğusunu rədd etdiniz")];
    }
    return [
      strong(user),
      plain(` sizin ${team} komandanızın oyunçu axtarışına qoşulmaq istəyir`),
    ];
  }
  if (request.status === "ACCEPTED") {
    return [strong(team), plain(" oynamaq təklifinizi qəbul etdi.")];
  }
  if (request.status === "CANCELLED") {
    return [strong(team), plain(" oyunçu axtarışını bağladı")];
  }
  return [strong(team), plain(" oynamaq təklifinizi qəbul etmədi.")];
}

export function challengeParts(
  request: ChallengeNotificationRequest,
  incoming: boolean,
): MessagePart[] {
  const team = incoming ? request.team.name : request.challenge.team.name;
  if (incoming) {
    if (request.status === "PENDING") {
      return [
        strong(team),
        plain(" komandası sizinlə oynamaq üçün dəvət göndərdi."),
      ];
    }
    if (request.status === "ACCEPTED") {
      return [strong(team), plain(" challenge sorğusunu qəbul etdiniz")];
    }
    if (request.status === "REJECTED") {
      return [strong(team), plain(" challenge sorğusunu rədd etdiniz")];
    }
    return [strong(team), plain(" üçün başqa rəqib seçildi")];
  }
  if (request.status === "ACCEPTED") {
    return [strong(team), plain(" komandası oyun təklifinizi qəbul etdi.")];
  }
  if (request.status === "REJECTED") {
    return [strong(team), plain(" komandası oyun təklifinizi qəbul etmədi.")];
  }
  return [strong(team), plain(" başqa rəqib seçdi")];
}

export function teamPlayerInviteParts(
  invite: TeamPlayerInvite,
  incoming: boolean,
): MessagePart[] {
  const team = invite.team.name;
  if (incoming) {
    return [
      strong(personName(invite.invitedBy)),
      plain(` sizi ${team} komandasına dəvət etdi`),
    ];
  }
  const player = personName(invite.invitedUser);
  if (invite.status === "ACCEPTED") {
    return [
      strong(player),
      plain(` sizin ${team} komandasına dəvətinizi qəbul etdi`),
    ];
  }
  return [
    strong(player),
    plain(` sizin ${team} komandasına dəvətinizi qəbul etmədi`),
  ];
}

export function isPendingFriendRequest(notification: AppNotification) {
  return (
    notification.type === "FRIEND_REQUEST" &&
    (notification.friendRequestStatus === "PENDING" ||
      notification.friendRequestStatus == null)
  );
}

export function isPendingChampionshipInvite(notification: AppNotification) {
  return (
    notification.type === "CHAMPIONSHIP_INVITE" &&
    (notification.championshipInviteStatus === "PENDING" ||
      notification.championshipInviteStatus == null)
  );
}

export function isPendingLeagueInvite(notification: AppNotification) {
  return (
    notification.type === "LEAGUE_INVITE" &&
    (notification.leagueInviteStatus === "PENDING" ||
      notification.leagueInviteStatus == null)
  );
}

export function isPendingJoinRequest(notification: AppNotification) {
  return (
    notification.type === "JOIN_REQUEST" &&
    (notification.joinRequestStatus === "PENDING" ||
      notification.joinRequestStatus == null)
  );
}

export function isPendingChampionshipJoinRequest(notification: AppNotification) {
  return (
    notification.type === "CHAMPIONSHIP_JOIN_REQUEST" &&
    (notification.championshipJoinRequestStatus === "PENDING" ||
      notification.championshipJoinRequestStatus == null)
  );
}

export function isAcceptedNotification(notification: AppNotification) {
  return (
    (notification.type === "FRIEND_REQUEST" &&
      notification.friendRequestStatus === "ACCEPTED") ||
    (notification.type === "CHAMPIONSHIP_INVITE" &&
      notification.championshipInviteStatus === "ACCEPTED") ||
    (notification.type === "LEAGUE_INVITE" &&
      notification.leagueInviteStatus === "ACCEPTED") ||
    (notification.type === "JOIN_REQUEST" &&
      notification.joinRequestStatus === "ACCEPTED") ||
    (notification.type === "CHAMPIONSHIP_JOIN_REQUEST" &&
      notification.championshipJoinRequestStatus === "ACCEPTED")
  );
}

export function isRejectedNotification(notification: AppNotification) {
  return (
    (notification.type === "FRIEND_REQUEST" &&
      notification.friendRequestStatus === "REJECTED") ||
    (notification.type === "CHAMPIONSHIP_INVITE" &&
      notification.championshipInviteStatus === "REJECTED") ||
    (notification.type === "LEAGUE_INVITE" &&
      notification.leagueInviteStatus === "REJECTED") ||
    (notification.type === "JOIN_REQUEST" &&
      (notification.joinRequestStatus === "REJECTED" ||
        notification.joinRequestStatus === "CANCELLED")) ||
    (notification.type === "CHAMPIONSHIP_JOIN_REQUEST" &&
      (notification.championshipJoinRequestStatus === "REJECTED" ||
        notification.championshipJoinRequestStatus === "CANCELLED"))
  );
}
