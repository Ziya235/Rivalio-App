import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import {
  createDirectConversation,
  fetchConversations,
  fetchMessages,
  type ChatMessage,
  type ConversationSummary,
} from "../../api/chat";
import {
  fetchFriends,
  fetchUserPresence,
  type FriendListItem,
} from "../../api/friends";
import {
  emitTypingStart,
  emitTypingStop,
  joinConversation,
  leaveConversation,
  markMessagesReadSocket,
  sendChatMessage,
  subscribeSocketEvent,
} from "../../services/socket";
import { buildFriendChatItems, displayName } from "./helpers";

export function useChat() {
  const { user, isLoading: authLoading } = useAuth();
  const { onlineUsers, lastSeenMap } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openingFriendId, setOpeningFriendId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [presence, setPresence] = useState<{
    online: boolean;
    lastSeenAt: string | null;
  }>({ online: false, lastSeenAt: null });

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingClientIds = useRef<Set<string>>(new Set());
  const typingTimeoutRef = useRef<number | null>(null);
  const isNearBottomRef = useRef(true);
  const openingFriendRef = useRef<number | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const otherUserId = activeConversation?.otherParticipant?.id ?? null;
  const activeFriendId = otherUserId ?? openingFriendId;

  const friendItems = useMemo(
    () => buildFriendChatItems(friends, conversations, search),
    [friends, conversations, search],
  );

  const loadSidebar = useCallback(async () => {
    setLoadingSidebar(true);
    try {
      const [friendList, conversationList] = await Promise.all([
        fetchFriends(),
        fetchConversations(),
      ]);
      setFriends(friendList);
      setConversations(conversationList);
    } finally {
      setLoadingSidebar(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (conversationId: number, cursor?: number) => {
      const isInitial = !cursor;
      if (isInitial) setLoadingMessages(true);
      else setLoadingMore(true);

      try {
        const page = await fetchMessages(conversationId, {
          cursor,
          limit: 30,
        });

        setMessages((current) => {
          if (isInitial) return page.messages;
          const merged = [...page.messages, ...current];
          const seen = new Set<number>();
          return merged.filter((message) => {
            if (seen.has(message.id)) return false;
            seen.add(message.id);
            return true;
          });
        });
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } finally {
        if (isInitial) setLoadingMessages(false);
        else setLoadingMore(false);
      }
    },
    [],
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowNewMessageButton(false);
    isNearBottomRef.current = true;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 80;
    setShowNewMessageButton(!isNearBottomRef.current);
  }, []);

  const selectConversation = useCallback(
    async (conversationId: number) => {
      if (activeConversationId && activeConversationId !== conversationId) {
        leaveConversation(activeConversationId);
      }

      setActiveConversationId(conversationId);
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);
      setMobileView("chat");
      setSearchParams({ conversation: String(conversationId) });

      joinConversation(conversationId);
      await loadMessages(conversationId);
      requestAnimationFrame(() => scrollToBottom("auto"));
    },
    [activeConversationId, loadMessages, scrollToBottom, setSearchParams],
  );

  const openChatWithFriend = useCallback(
    async (friendId: number) => {
      const existing = conversations.find(
        (conversation) => conversation.otherParticipant?.id === friendId,
      );
      if (existing) {
        await selectConversation(existing.id);
        return;
      }

      if (openingFriendRef.current === friendId) return;
      openingFriendRef.current = friendId;
      setOpeningFriendId(friendId);
      setMobileView("chat");

      try {
        const conversation = await createDirectConversation(friendId);
        setConversations((current) => {
          if (current.some((item) => item.id === conversation.id)) {
            return current;
          }
          return [conversation, ...current];
        });
        await selectConversation(conversation.id);
      } catch {
        setMobileView("list");
      } finally {
        openingFriendRef.current = null;
        setOpeningFriendId(null);
      }
    },
    [conversations, selectConversation],
  );

  useEffect(() => {
    if (!user) return;
    loadSidebar();
  }, [user, loadSidebar]);

  useEffect(() => {
    const conversationParam = searchParams.get("conversation");
    const userParam = searchParams.get("user");

    const conversationId = conversationParam ? Number(conversationParam) : null;
    if (conversationId && Number.isInteger(conversationId)) {
      if (conversationId !== activeConversationId) {
        selectConversation(conversationId);
      }
      return;
    }

    if (!userParam) return;

    const targetUserId = Number(userParam);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) return;

    createDirectConversation(targetUserId)
      .then((conversation) => {
        setConversations((current) => {
          if (current.some((item) => item.id === conversation.id)) {
            return current;
          }
          return [conversation, ...current];
        });
        return selectConversation(conversation.id);
      })
      .catch(() => undefined);
  }, [searchParams, activeConversationId, selectConversation]);

  useEffect(() => {
    if (!activeConversationId || !user) return;

    const unsubscribers = [
      subscribeSocketEvent("new_message", (payload: { message: ChatMessage }) => {
        const incoming = payload.message;
        if (incoming.conversationId !== activeConversationId) {
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === incoming.conversationId
                ? {
                    ...conversation,
                    lastMessage: incoming,
                    lastMessageAt: incoming.createdAt,
                    unreadCount:
                      incoming.senderId === user.id
                        ? conversation.unreadCount
                        : conversation.unreadCount + 1,
                  }
                : conversation,
            ),
          );
          return;
        }

        setMessages((current) => {
          if (current.some((message) => message.id === incoming.id)) {
            return current;
          }
          if (
            incoming.clientMessageId &&
            current.some(
              (message) => message.clientMessageId === incoming.clientMessageId,
            )
          ) {
            return current.map((message) =>
              message.clientMessageId === incoming.clientMessageId
                ? incoming
                : message,
            );
          }
          return [...current, incoming];
        });

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === incoming.conversationId
              ? {
                  ...conversation,
                  lastMessage: incoming,
                  lastMessageAt: incoming.createdAt,
                  unreadCount:
                    incoming.senderId === user.id ? 0 : conversation.unreadCount,
                }
              : conversation,
          ),
        );

        if (isNearBottomRef.current) {
          requestAnimationFrame(() => scrollToBottom());
        } else if (incoming.senderId !== user.id) {
          setShowNewMessageButton(true);
        }

        if (incoming.senderId !== user.id) {
          markMessagesReadSocket(activeConversationId, incoming.id);
        }
      }),
      subscribeSocketEvent("messages_read", (payload: {
        conversationId: number;
        readByUserId: number;
        upToMessageId: number | null;
      }) => {
        if (payload.conversationId !== activeConversationId) return;
        if (payload.readByUserId === user.id) return;

        setMessages((current) =>
          current.map((message) =>
            message.senderId === user.id
              ? { ...message, readByOthers: true }
              : message,
          ),
        );
      }),
      subscribeSocketEvent(
        "typing_start",
        (payload: { conversationId: number; user?: { id: number } }) => {
          if (
            payload.conversationId === activeConversationId &&
            payload.user &&
            payload.user.id !== user.id
          ) {
            setTypingUserId(payload.user.id);
          }
        },
      ),
      subscribeSocketEvent(
        "typing_stop",
        (payload: { conversationId: number; userId: number }) => {
          if (
            payload.conversationId === activeConversationId &&
            payload.userId !== user.id
          ) {
            setTypingUserId(null);
          }
        },
      ),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      leaveConversation(activeConversationId);
    };
  }, [activeConversationId, user, scrollToBottom]);

  useEffect(() => {
    if (!otherUserId) return;

    const onlineFromSocket = onlineUsers[otherUserId];
    const lastSeenFromSocket = lastSeenMap[otherUserId];

    if (onlineFromSocket !== undefined) {
      setPresence({
        online: onlineFromSocket,
        lastSeenAt: lastSeenFromSocket ?? null,
      });
      return;
    }

    fetchUserPresence(otherUserId).then(setPresence).catch(() => undefined);
  }, [otherUserId, onlineUsers, lastSeenMap]);

  useEffect(() => {
    if (!activeConversationId || messages.length === 0 || !user) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.senderId !== user.id) {
      markMessagesReadSocket(activeConversationId, lastMessage.id);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
    }
  }, [activeConversationId, messages, user]);

  const handleSend = () => {
    if (!activeConversationId || !user) return;
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    const clientMessageId = crypto.randomUUID();
    pendingClientIds.current.add(clientMessageId);

    const optimistic: ChatMessage = {
      id: -Date.now(),
      conversationId: activeConversationId,
      senderId: user.id,
      content: trimmed,
      clientMessageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      sender: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
      },
      readByOthers: false,
    };

    setMessages((current) => [...current, optimistic]);
    setMessageInput("");
    emitTypingStop(activeConversationId);
    sendChatMessage({
      conversationId: activeConversationId,
      content: trimmed,
      clientMessageId,
    });
    requestAnimationFrame(() => scrollToBottom());
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    if (!activeConversationId) return;

    emitTypingStart(activeConversationId);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      emitTypingStop(activeConversationId);
    }, 1200);
  };

  const handleLoadOlder = async () => {
    if (!activeConversationId || !nextCursor || loadingMore) return;
    const container = messagesContainerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    await loadMessages(activeConversationId, nextCursor);
    requestAnimationFrame(() => {
      if (!container) return;
      container.scrollTop = container.scrollHeight - previousHeight;
    });
  };

  const typingName =
    typingUserId && activeConversation?.otherParticipant?.id === typingUserId
      ? displayName(activeConversation.otherParticipant)
      : null;

  return {
    user,
    authLoading,
    onlineUsers,
    friendItems,
    activeConversation,
    activeFriendId,
    messages,
    hasMore,
    loadingSidebar,
    loadingMessages,
    loadingMore,
    openingFriendId,
    messageInput,
    search,
    setSearch,
    mobileView,
    setMobileView,
    typingName,
    showNewMessageButton,
    presence,
    messagesContainerRef,
    messagesEndRef,
    openChatWithFriend,
    handleSend,
    handleInputChange,
    handleLoadOlder,
    handleMessagesScroll,
    scrollToBottom,
  };
}
