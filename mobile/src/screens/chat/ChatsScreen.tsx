import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { chatApi, friendsApi } from "../../api/people";
import { Screen, useRefreshTint } from "../../components/Screen";
import { EmptyState, ErrorState, SkeletonList } from "../../components/states";
import { Avatar, CountBadge, Row, TextField } from "../../components/ui";
import { useCurrentUser } from "../../context/AuthContext";
import { useRealtime, useSocketEvent } from "../../context/RealtimeContext";
import { useQuery } from "../../hooks/useQuery";
import { ff, font, spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import type { ConversationSummary, FriendListItem } from "../../types/chat";
import type { UserBrief } from "../../types/common";
import { formatRelative, fullName } from "../../utils/format";

type ChatItem = { friend: UserBrief; conversation: ConversationSummary | null };

/** Same ordering as frontend/src/pages/Chat/helpers.ts: unread first, then latest message. */
function buildItems(friends: FriendListItem[], conversations: ConversationSummary[], search: string): ChatItem[] {
  const byUser = new Map<number, ConversationSummary>();
  conversations.forEach((c) => c.otherParticipant && byUser.set(c.otherParticipant.id, c));
  const q = search.trim().toLowerCase();
  return friends
    .map((f) => ({ friend: f.friend, conversation: byUser.get(f.friend.id) ?? null }))
    .filter(({ friend }) => !q || fullName(friend).toLowerCase().includes(q) || friend.username.toLowerCase().includes(q))
    .sort((a, b) => {
      const au = a.conversation?.unreadCount ?? 0;
      const bu = b.conversation?.unreadCount ?? 0;
      if (au > 0 && bu === 0) return -1;
      if (bu > 0 && au === 0) return 1;
      const at = a.conversation?.lastMessageAt;
      const bt = b.conversation?.lastMessageAt;
      if (at && bt) return Date.parse(bt) - Date.parse(at);
      if (at) return -1;
      if (bt) return 1;
      return fullName(a.friend).localeCompare(fullName(b.friend), "az");
    });
}

export function ChatsScreen() {
  const navigation = useNavigation();
  const user = useCurrentUser();
  const { onlineUsers, clearChatBadge } = useRealtime();
  const [search, setSearch] = useState("");
  const styles = useStyles();
  const refreshTint = useRefreshTint();
  const query = useQuery("chat:sidebar", async () => {
    const [friends, conversations] = await Promise.all([friendsApi.list(), chatApi.conversations()]);
    return { friends, conversations };
  });

  // Opening the chat list clears the tab badge, like visiting /chat on the web.
  useFocusEffect(
    useCallback(() => {
      clearChatBadge();
      void query.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearChatBadge]),
  );

  useSocketEvent("chat_unread", () => void query.reload());
  useSocketEvent("new_message", ({ message }) => {
    query.setData((current) =>
      current
        ? {
            ...current,
            conversations: current.conversations.map((c) =>
              c.id === message.conversationId
                ? {
                    ...c,
                    lastMessage: message,
                    lastMessageAt: message.createdAt,
                    unreadCount: message.senderId === user.id ? c.unreadCount : c.unreadCount + 1,
                  }
                : c,
            ),
          }
        : current,
    );
  });

  const items = useMemo(
    () => (query.data ? buildItems(query.data.friends, query.data.conversations, search) : []),
    [query.data, search],
  );

  return (
    <Screen>
      <View style={styles.search}>
        <TextField icon="search" value={search} onChangeText={setSearch} placeholder="Dost axtar..." accessibilityLabel="Dost axtar" />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.friend.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} {...refreshTint} />}
        ListEmptyComponent={
          query.loading ? (
            <SkeletonList />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={query.refresh} />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title={search ? "Dost tapılmadı" : "Hələ dostunuz yoxdur"}
              description={search ? undefined : "Yalnız dostlarınızla yazışa bilərsiniz."}
              action={search ? undefined : { label: "Oyunçu axtar", onPress: () => navigation.navigate("UserSearch") }}
            />
          )
        }
        renderItem={({ item }) => {
          const online = onlineUsers[item.friend.id]?.online ?? false;
          const last = item.conversation?.lastMessage;
          const unread = item.conversation?.unreadCount ?? 0;
          return (
            <Pressable
              onPress={() =>
                navigation.navigate("ChatThread", item.conversation ? { conversationId: item.conversation.id } : { userId: item.friend.id })
              }
              accessibilityRole="button"
              accessibilityLabel={`${fullName(item.friend)}${unread ? `, ${unread} oxunmamış mesaj` : ""}`}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View>
                <Avatar uri={item.friend.image} name={fullName(item.friend)} size={48} />
                {online ? <View style={styles.online} /> : null}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Row>
                  <Text style={[styles.name, unread > 0 && styles.bold]} numberOfLines={1}>
                    {fullName(item.friend)}
                  </Text>
                  {last ? <Text style={[styles.time, unread > 0 && styles.timeUnread]}>{formatRelative(last.createdAt)}</Text> : null}
                </Row>
                <Row>
                  <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>
                    {last ? `${last.senderId === user.id ? "Siz: " : ""}${last.content}` : `@${item.friend.username}`}
                  </Text>
                  <CountBadge count={unread} />
                </Row>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  search: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  separator: { height: 1, backgroundColor: c.border, marginLeft: 60 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12 },
  name: { flex: 1, fontSize: font.md, fontFamily: ff.semibold, color: c.ink },
  bold: { fontFamily: ff.extrabold },
  time: { fontSize: font.xs, fontFamily: ff.regular, color: c.textFaint },
  timeUnread: { color: c.brandInk, fontFamily: ff.semibold },
  preview: { flex: 1, fontSize: 12.5, fontFamily: ff.regular, color: c.textFaint },
  previewUnread: { color: c.textMuted },
  online: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: c.bg,
  },
}));
