import type { AppNotification } from "../api/notifications";

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

export function notificationLabel(notification: AppNotification) {
  if (
    notification.type === "FRIEND_REQUEST" &&
    notification.friendRequestStatus === "ACCEPTED"
  ) {
    return "dostluq sorğusunu qəbul etdiniz";
  }
  if (
    notification.type === "FRIEND_REQUEST" &&
    notification.friendRequestStatus === "REJECTED"
  ) {
    return "dostluq sorğusunu rədd etdiniz";
  }

  const champName =
    notification.championshipInvite?.championship.name ??
    notification.championshipJoinRequest?.championship.name ??
    "çempionata";
  const teamName =
    notification.championshipInvite?.team.name ??
    notification.championshipJoinRequest?.team.name;
  const leagueName =
    notification.leagueInvite?.league.name ??
    notification.joinRequest?.league.name ??
    "liqa";
  const leagueTeamName =
    notification.leagueInvite?.team.name ?? notification.joinRequest?.team.name;

  if (notification.type === "CHAMPIONSHIP_INVITE") {
    if (notification.championshipInviteStatus === "ACCEPTED") {
      return teamName
        ? `${teamName} komandası ${champName} dəvətini qəbul etdi`
        : `${champName} dəvətini qəbul etdi`;
    }
    if (notification.championshipInviteStatus === "REJECTED") {
      return teamName
        ? `${teamName} komandası ${champName} dəvətini rədd etdi`
        : `${champName} dəvətini rədd etdi`;
    }
    if (notification.championshipInviteStatus === "CANCELLED") {
      return `${champName} dəvəti ləğv edildi`;
    }
    return teamName
      ? `${teamName} komandanızı ${champName} çempionatına dəvət etdi`
      : `komandanızı ${champName} çempionatına dəvət etdi`;
  }

  if (notification.type === "LEAGUE_INVITE") {
    if (notification.leagueInviteStatus === "ACCEPTED") {
      return leagueTeamName
        ? `${leagueTeamName} komandası ${leagueName} dəvətini qəbul etdi`
        : `${leagueName} dəvətini qəbul etdi`;
    }
    if (notification.leagueInviteStatus === "REJECTED") {
      return leagueTeamName
        ? `${leagueTeamName} komandası ${leagueName} dəvətini rədd etdi`
        : `${leagueName} dəvətini rədd etdi`;
    }
    if (notification.leagueInviteStatus === "CANCELLED") {
      return `${leagueName} dəvəti ləğv edildi`;
    }
    return leagueTeamName
      ? `${leagueTeamName} komandanızı ${leagueName} liqasına dəvət etdi`
      : `komandanızı ${leagueName} liqasına dəvət etdi`;
  }

  if (notification.type === "JOIN_REQUEST") {
    if (notification.joinRequestStatus === "ACCEPTED") {
      return leagueTeamName
        ? `${leagueTeamName} komandasının ${leagueName} sorğusu qəbul edildi`
        : `${leagueName} sorğusu qəbul edildi`;
    }
    if (notification.joinRequestStatus === "REJECTED") {
      return leagueTeamName
        ? `${leagueTeamName} komandasının ${leagueName} sorğusu rədd edildi`
        : `${leagueName} sorğusu rədd edildi`;
    }
    if (notification.joinRequestStatus === "CANCELLED") {
      return leagueTeamName
        ? `${leagueTeamName} komandası ${leagueName} sorğusunu ləğv etdi`
        : `${leagueName} sorğusu ləğv edildi`;
    }
    return `${leagueName} ligasında iştirak etmək üçün dəvət göndərdi`;
  }

  if (notification.type === "CHAMPIONSHIP_JOIN_REQUEST") {
    if (notification.championshipJoinRequestStatus === "ACCEPTED") {
      return teamName
        ? `${teamName} komandasının ${champName} sorğusu qəbul edildi`
        : `${champName} sorğusu qəbul edildi`;
    }
    if (notification.championshipJoinRequestStatus === "REJECTED") {
      return teamName
        ? `${teamName} komandasının ${champName} sorğusu rədd edildi`
        : `${champName} sorğusu rədd edildi`;
    }
    if (notification.championshipJoinRequestStatus === "CANCELLED") {
      return teamName
        ? `${teamName} komandası ${champName} sorğusunu ləğv etdi`
        : `${champName} sorğusu ləğv edildi`;
    }
    return `${champName} çempionatında iştirak etmək üçün dəvət göndərdi`;
  }

  switch (notification.type) {
    case "FRIEND_REQUEST":
      return "sizə dostluq sorğusu göndərdi";
    case "FRIEND_ACCEPTED":
      return "dostluq sorğunuzu qəbul etdi";
    case "NEW_MESSAGE":
      return "yeni mesaj göndərdi";
    default:
      return "bildiriş göndərdi";
  }
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
