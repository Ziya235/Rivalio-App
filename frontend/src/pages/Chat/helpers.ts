import type { ConversationSummary } from "../../api/chat";
import type { FriendListItem, UserBrief } from "../../api/friends";

export type FriendChatItem = {
  friend: UserBrief;
  conversation: ConversationSummary | null;
};

export function displayName(
  user:
    | Pick<UserBrief, "firstName" | "lastName" | "username">
    | null
    | undefined,
) {
  if (!user) return "Söhbət";
  return `${user.firstName} ${user.lastName}`.trim() || user.username;
}

export function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" });
}

export function formatListTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) return formatMessageTime(value);
  return date.toLocaleDateString("az", { day: "numeric", month: "short" });
}

export function formatLastSeen(value: string | null) {
  if (!value) return "Son görülmə məlum deyil";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Son görülmə məlum deyil";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `Son görülmə: ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildFriendChatItems(
  friends: FriendListItem[],
  conversations: ConversationSummary[],
  search: string,
): FriendChatItem[] {
  const conversationByUserId = new Map<number, ConversationSummary>();
  for (const conversation of conversations) {
    const otherId = conversation.otherParticipant?.id;
    if (otherId) conversationByUserId.set(otherId, conversation);
  }

  const query = search.trim().toLowerCase();

  return friends
    .map((item) => ({
      friend: item.friend,
      conversation: conversationByUserId.get(item.friend.id) ?? null,
    }))
    .filter(({ friend }) => {
      if (!query) return true;
      const name = displayName(friend).toLowerCase();
      return (
        name.includes(query) || friend.username.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aUnread = a.conversation?.unreadCount ?? 0;
      const bUnread = b.conversation?.unreadCount ?? 0;
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;

      const aTime = a.conversation?.lastMessageAt;
      const bTime = b.conversation?.lastMessageAt;
      if (aTime && bTime) {
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      if (aTime) return -1;
      if (bTime) return 1;
      return displayName(a.friend).localeCompare(displayName(b.friend), "az");
    });
}
