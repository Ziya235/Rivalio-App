import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { toApiError, type ApiError } from "../../api/errors";
import { chatApi, friendsApi } from "../../api/people";
import { Screen } from "../../components/Screen";
import { ErrorState, LoadingView } from "../../components/states";
import { Avatar } from "../../components/ui";
import { useCurrentUser } from "../../context/AuthContext";
import { useRealtime, useSocketEvent } from "../../context/RealtimeContext";
import type { RootScreenProps } from "../../navigation/types";
import { realtime } from "../../sockets/socket";
import { ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { ChatMessage, ConversationSummary, UserPresence } from "../../types/chat";
import { formatLastSeen, formatTime, fullName } from "../../utils/format";

const PAGE_SIZE = 30;
const MAX_LENGTH = 5000; // backend MAX_MESSAGE_LENGTH

function newClientId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Newest-first merge with de-duplication by id and clientMessageId. */
function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byClient = new Map<string, ChatMessage>();
  incoming.forEach((m) => m.clientMessageId && byClient.set(m.clientMessageId, m));
  const kept = current.filter((m) => !(m.pending && m.clientMessageId && byClient.has(m.clientMessageId)));
  const seen = new Set(kept.map((m) => m.id));
  const merged = [...kept, ...incoming.filter((m) => !seen.has(m.id))];
  return merged.sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? -1 : 1;
    return b.id - a.id || Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function ChatThreadScreen({ route, navigation }: RootScreenProps<"ChatThread">) {
  const user = useCurrentUser();
  const { isConnected, onlineUsers, refreshChatUnread } = useRealtime();
  const { c } = useTheme();
  const styles = useStyles();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(route.params.conversationId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClear = useRef<ReturnType<typeof setTimeout> | null>(null);

  const other = conversation?.otherParticipant ?? null;

  // Resolve the conversation (opening a direct one if we came from a friend).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let convId = route.params.conversationId ?? null;
        let summary: ConversationSummary | null = null;
        if (!convId && route.params.userId) {
          summary = await chatApi.openDirect(route.params.userId);
          convId = summary.id;
        } else if (convId) {
          const list = await chatApi.conversations();
          summary = list.find((c) => c.id === convId) ?? null;
        }
        if (cancelled) return;
        if (!convId) throw new Error("no conversation");
        setConversation(summary);
        setConversationId(convId);
      } catch (err) {
        if (!cancelled) {
          setError(toApiError(err));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params.conversationId, route.params.userId]);

  const loadLatest = useCallback(async (convId: number) => {
    try {
      const page = await chatApi.messages(convId, { limit: PAGE_SIZE });
      setMessages((current) => mergeMessages(current, page.messages));
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setError(null);
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (conversationId) void loadLatest(conversationId);
  }, [conversationId, loadLatest]);

  // Join the socket room on open and after every reconnect (rooms are per socket);
  // refetch the latest page on reconnect so nothing sent while offline is missed.
  const wasConnected = useRef(isConnected);
  useEffect(() => {
    if (!conversationId) return;
    if (isConnected) {
      realtime.emit("join_conversation", { conversationId });
      if (!wasConnected.current) void loadLatest(conversationId);
    }
    wasConnected.current = isConnected;
  }, [conversationId, isConnected, loadLatest]);

  useEffect(() => {
    if (!conversationId) return;
    return () => {
      realtime.emit("typing_stop", { conversationId });
      realtime.emit("leave_conversation", { conversationId });
      void refreshChatUnread();
    };
  }, [conversationId, refreshChatUnread]);

  useSocketEvent("new_message", ({ message }) => {
    if (message.conversationId !== conversationId) return;
    setMessages((current) => mergeMessages(current, [message]));
    if (message.senderId !== user.id) {
      setTyping(false);
      realtime.emit("mark_messages_read", { conversationId: message.conversationId, upToMessageId: message.id });
    }
  });

  useSocketEvent("messages_read", (payload) => {
    if (payload.conversationId !== conversationId || payload.readByUserId === user.id) return;
    setMessages((current) => current.map((m) => (m.senderId === user.id && !m.pending ? { ...m, readByOthers: true } : m)));
  });

  useSocketEvent("typing_start", (payload) => {
    if (payload.conversationId !== conversationId || payload.user?.id === user.id) return;
    setTyping(true);
    if (typingClear.current) clearTimeout(typingClear.current);
    typingClear.current = setTimeout(() => setTyping(false), 5000);
  });

  useSocketEvent("typing_stop", (payload) => {
    if (payload.conversationId === conversationId && payload.userId !== user.id) setTyping(false);
  });

  useSocketEvent("error_message", (payload) => {
    if (!payload.clientMessageId) return;
    setMessages((current) =>
      current.map((m) => (m.clientMessageId === payload.clientMessageId ? { ...m, pending: false, failed: true } : m)),
    );
  });

  // Mark as read whenever the newest message is from the other person.
  const newest = messages.find((m) => !m.pending);
  useEffect(() => {
    if (!conversationId || !newest || newest.senderId === user.id || !isConnected) return;
    realtime.emit("mark_messages_read", { conversationId, upToMessageId: newest.id });
  }, [conversationId, newest, user.id, isConnected]);

  // Presence: live from the socket, falling back to the REST snapshot.
  useEffect(() => {
    if (!other) return;
    const live = onlineUsers[other.id];
    if (live) {
      setPresence({ userId: other.id, online: live.online, lastSeenAt: live.lastSeenAt });
      return;
    }
    friendsApi.presence(other.id).then(setPresence).catch(() => undefined);
  }, [other, onlineUsers]);

  useEffect(() => {
    if (!other) return;
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={() => navigation.navigate("PlayerProfile", { userId: other.id })}
          style={styles.headerTitle}
          accessibilityRole="button"
          accessibilityLabel={`${fullName(other)} profili`}
        >
          <Avatar uri={other.image} name={fullName(other)} size={32} />
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {fullName(other)}
            </Text>
            <Text style={[styles.headerSub, (typing || presence?.online) && styles.headerOnline]}>
              {typing ? "yazır..." : presence?.online ? "onlayn" : formatLastSeen(presence?.lastSeenAt)}
            </Text>
          </View>
        </Pressable>
      ),
    });
  }, [navigation, other, presence, typing]);

  const loadOlder = async () => {
    if (!conversationId || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await chatApi.messages(conversationId, { cursor, limit: PAGE_SIZE });
      setMessages((current) => mergeMessages(current, page.messages));
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      // Keep existing messages; user can scroll again to retry.
    } finally {
      setLoadingMore(false);
    }
  };

  const send = (text = input, retryOf?: ChatMessage) => {
    const content = text.trim();
    if (!conversationId || !content) return;
    const clientMessageId = retryOf?.clientMessageId ?? newClientId();
    const optimistic: ChatMessage = {
      id: -Date.now(),
      conversationId,
      senderId: user.id,
      content,
      clientMessageId,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      sender: { id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName, image: user.image },
      readByOthers: false,
      pending: true,
    };
    setMessages((current) => mergeMessages(current.filter((m) => m.clientMessageId !== clientMessageId), [optimistic]));
    if (!retryOf) setInput("");
    realtime.emit("typing_stop", { conversationId });
    // socket.io buffers the emit while reconnecting; the server de-duplicates by clientMessageId.
    realtime.emit("send_message", { conversationId, content, clientMessageId });
  };

  const onChangeText = (value: string) => {
    setInput(value);
    if (!conversationId) return;
    realtime.emit("typing_start", { conversationId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => realtime.emit("typing_stop", { conversationId }), 1200);
  };

  const data = useMemo(() => messages, [messages]);

  if (loading) return <LoadingView />;
  if (error && messages.length === 0) {
    return <ErrorState error={error} message={error.kind === "forbidden" ? "Bu əməliyyat üçün dost olmalısınız" : undefined} onRetry={() => conversationId && void loadLatest(conversationId)} />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={headerHeight}>
        {!isConnected ? (
          <View style={styles.offline}>
            <Ionicons name="cloud-offline-outline" size={14} color={c.amber} />
            <Text style={styles.offlineText}>Bağlantı bərpa olunur...</Text>
          </View>
        ) : null}
        <FlatList
          data={data}
          inverted
          keyExtractor={(m) => m.clientMessageId ?? String(m.id)}
          contentContainerStyle={styles.list}
          onEndReached={() => hasMore && void loadOlder()}
          onEndReachedThreshold={0.3}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={loadingMore ? <ActivityIndicator color={c.green} style={{ margin: spacing.md }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>Söhbətə başlayın 👋</Text>
            </View>
          }
          renderItem={({ item }) => <Bubble message={item} mine={item.senderId === user.id} onRetry={() => send(item.content, item)} />}
        />
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <TextInput
            value={input}
            onChangeText={onChangeText}
            placeholder="Mesaj yaz..."
            placeholderTextColor={c.textFaint}
            style={styles.input}
            multiline
            maxLength={MAX_LENGTH}
            accessibilityLabel="Mesaj"
          />
          <Pressable
            onPress={() => send()}
            disabled={!input.trim()}
            style={[styles.send, !input.trim() && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel="Göndər"
          >
            <Ionicons name="send" size={19} color={c.onBrand} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ message, mine, onRetry }: { message: ChatMessage; mine: boolean; onRetry: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}>
      <Pressable
        disabled={!message.failed}
        onPress={onRetry}
        style={[styles.bubble, mine ? styles.mine : styles.theirs, message.failed && styles.failed]}
        accessibilityLabel={`${mine ? "Siz" : fullName(message.sender)}: ${message.content}`}
      >
        <Text style={[styles.bubbleText, mine && { color: c.onBrand }]}>{message.content}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
            {message.failed ? "Göndərilmədi · yenidən cəhd üçün toxunun" : formatTime(message.createdAt)}
          </Text>
          {mine && !message.failed ? (
            <Ionicons
              name={message.pending ? "time-outline" : message.readByOthers ? "checkmark-done" : "checkmark"}
              size={14}
              color={message.readByOthers ? "#2563EB" : "rgba(8,8,14,0.55)"}
            />
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  list: { padding: spacing.md, gap: 6, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", transform: [{ scaleY: -1 }] },
  empty: { color: c.textMuted, padding: spacing.xl, fontFamily: ff.regular },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  mine: { backgroundColor: c.brand, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: c.cardMuted, borderBottomLeftRadius: 6 },
  failed: { backgroundColor: c.redSoft, borderColor: c.redBorder, borderWidth: 1 },
  bubbleText: { fontSize: 14.5, fontFamily: ff.regular, color: c.ink, lineHeight: 20 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", marginTop: 3 },
  bubbleTime: { fontSize: 10.5, fontFamily: ff.regular, color: c.textMuted },
  bubbleTimeMine: { color: "rgba(8,8,14,0.6)" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    backgroundColor: c.tabBar,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: c.input,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: font.md,
    fontFamily: ff.regular,
    color: c.ink,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm, maxWidth: 240 },
  headerName: { fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  headerSub: { fontSize: font.xs, fontFamily: ff.regular, color: c.textMuted },
  headerOnline: { color: c.green },
  offline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: c.amberSoft,
  },
  offlineText: { fontSize: font.xs, color: c.amber, fontFamily: ff.bold },
  radius: { borderRadius: radius.md },
}));
