import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useOutletContext, useSearchParams } from "react-router-dom";
import type { AppOutletContext } from "../App";
import {
  ArrowLeft,
  ArrowDown,
  Search,
  Send,
} from "lucide-react";
import { Avatar } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  fetchConversations,
  fetchMessages,
  createDirectConversation,
  type ChatMessage,
  type ConversationSummary,
} from "../api/chat";
import { fetchUserPresence } from "../api/friends";
import {
  joinConversation,
  leaveConversation,
  markMessagesReadSocket,
  sendChatMessage,
  subscribeSocketEvent,
  emitTypingStart,
  emitTypingStop,
} from "../services/socket";

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" });
}

function formatListTime(value: string) {
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

function formatLastSeen(value: string | null) {
  if (!value) return "Son görülmə məlum deyil";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Son görülmə məlum deyil";
  return `Son görülmə: ${date.toLocaleString("az", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function displayName(user: ConversationSummary["otherParticipant"]) {
  if (!user) return "Söhbət";
  return `${user.firstName} ${user.lastName}`.trim() || user.username;
}

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isDarkMode } = useOutletContext<AppOutletContext>();
  const { onlineUsers, lastSeenMap } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const light = !isDarkMode;
  const bg = light
    ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]"
    : "bg-[#08080e]";
  const sidebarBorder = light ? "border-gray-200" : "border-white/7";
  const panelBg = light ? "bg-white/80 backdrop-blur-sm" : "bg-transparent";
  const titleText = light ? "text-gray-900" : "text-white";
  const mutedText = light ? "text-gray-500" : "text-white/45";
  const softText = light ? "text-gray-400" : "text-white/35";
  const inputBg = light
    ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
    : "bg-[#18181f] border-white/10 text-white placeholder-white/30";
  const searchIcon = light ? "text-gray-400" : "text-white/30";
  const listHover = light ? "hover:bg-gray-100" : "hover:bg-white/4";
  const listActive = light
    ? "bg-emerald-500/10 border-r-2 border-emerald-500"
    : "bg-[#c5f135]/5 border-r-2 border-[#c5f135]";
  const onlineDotBorder = light ? "border-white" : "border-[#08080e]";
  const accent = light ? "text-emerald-600" : "text-[#c5f135]";
  const accentBg = light
    ? "bg-emerald-500 text-white hover:bg-emerald-600"
    : "bg-[#c5f135] text-[#08080e] hover:bg-[#d4f55a]";
  const unreadBadge = light
    ? "bg-emerald-500 text-white"
    : "bg-[#c5f135] text-[#08080e]";
  const theirBubble = light
    ? "bg-white text-gray-900 border border-gray-200 rounded-tl-sm shadow-sm"
    : "bg-[#18181f] text-white border border-white/7 rounded-tl-sm";
  const theirBubbleTime = light ? "text-gray-400" : "text-white/30";
  const myBubble = light
    ? "bg-emerald-500 text-white rounded-tr-sm"
    : "bg-[#c5f135] text-[#08080e] rounded-tr-sm";
  const myBubbleTime = light ? "text-white/70 text-right" : "text-[#08080e]/60 text-right";
  const emptyState = light ? "text-gray-400" : "text-white/50";
  const newMsgBtn = light
    ? "bg-white border-gray-200 text-gray-700 shadow-md"
    : "bg-[#18181f] border-white/10 text-white shadow-lg";
  const backBtn = light
    ? "text-gray-500 hover:text-gray-900"
    : "text-white/50 hover:text-white";
  const loadOlderBtn = light
    ? "text-gray-500 hover:text-gray-800"
    : "text-white/45 hover:text-white/70";

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const otherUserId = activeConversation?.otherParticipant?.id ?? null;

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const name = displayName(conversation.otherParticipant).toLowerCase();
      const preview = conversation.lastMessage?.content.toLowerCase() ?? "";
      return name.includes(query) || preview.includes(query);
    });
  }, [conversations, search]);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
    } finally {
      setLoadingConversations(false);
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

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, loadConversations]);

  useEffect(() => {
    const conversationParam = searchParams.get("conversation");
    const userParam = searchParams.get("user");

    const conversationId = conversationParam ? Number(conversationParam) : null;
    if (
      conversationId &&
      Number.isInteger(conversationId) &&
      conversationId !== activeConversationId
    ) {
      selectConversation(conversationId);
      return;
    }

    if (userParam) {
      const otherUserId = Number(userParam);
      if (!Number.isInteger(otherUserId) || otherUserId <= 0) return;

      createDirectConversation(otherUserId)
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
    }
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
      subscribeSocketEvent("typing_start", (payload: {
        conversationId: number;
        user?: { id: number };
      }) => {
        if (
          payload.conversationId === activeConversationId &&
          payload.user?.id !== user.id
        ) {
          setTypingUserId(payload.user.id);
        }
      }),
      subscribeSocketEvent("typing_stop", (payload: {
        conversationId: number;
        userId: number;
      }) => {
        if (
          payload.conversationId === activeConversationId &&
          payload.userId !== user.id
        ) {
          setTypingUserId(null);
        }
      }),
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

  if (authLoading) {
    return (
      <div className={`${bg} min-h-screen pt-24 text-center ${softText}`}>
        Yüklənir...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const typingName =
    typingUserId && activeConversation?.otherParticipant?.id === typingUserId
      ? displayName(activeConversation.otherParticipant)
      : null;

  return (
    <div className={`${bg} min-h-screen pt-16 transition-colors duration-300`}>
      <div className="max-w-[1280px] mx-auto h-[calc(100vh-64px)] flex">
        <div
          className={`${mobileView === "chat" ? "hidden" : "flex"} md:flex flex-col w-full md:w-80 lg:w-96 border-r ${sidebarBorder} flex-shrink-0 ${panelBg}`}
        >
          <div className={`p-4 border-b ${sidebarBorder}`}>
            <h2 className={`font-display text-2xl font-700 ${titleText} mb-3`}>
              Mesajlar
            </h2>
            <div className="relative">
              <Search
                size={14}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${searchIcon}`}
              />
              <input
                type="text"
                placeholder="Axtar..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`w-full border rounded-xl pl-9 pr-4 py-2 text-sm ${inputBg}`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <p className={`px-4 py-6 text-sm ${softText}`}>Yüklənir...</p>
            ) : filteredConversations.length === 0 ? (
              <p className={`px-4 py-6 text-sm ${softText}`}>
                Hələ söhbət yoxdur
              </p>
            ) : (
              filteredConversations.map((conversation) => {
                const name = displayName(conversation.otherParticipant);
                const otherId = conversation.otherParticipant?.id;
                const online = otherId ? onlineUsers[otherId] : false;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 ${listHover} transition-colors text-left ${
                      activeConversationId === conversation.id ? listActive : ""
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        name={name}
                        src={conversation.otherParticipant?.image || undefined}
                        size="md"
                      />
                      {online ? (
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${onlineDotBorder} ${
                            light ? "bg-emerald-500" : "bg-[#c5f135]"
                          }`}
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`${titleText} text-sm font-semibold truncate`}>
                          {name}
                        </span>
                        <span className={`${softText} text-xs flex-shrink-0`}>
                          {formatListTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`${mutedText} text-xs truncate`}>
                          {conversation.lastMessage?.content || "Söhbətə başlayın"}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <span
                            className={`ml-2 min-w-[18px] h-[18px] ${unreadBadge} text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0`}
                          >
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {activeConversation ? (
          <div
            className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-col flex-1 min-w-0 relative ${light ? "bg-white/40" : ""}`}
          >
            <div className={`px-5 py-3.5 border-b ${sidebarBorder} flex items-center gap-3 ${light ? "bg-white/60 backdrop-blur-sm" : ""}`}>
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className={`md:hidden p-1.5 ${backBtn}`}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="relative">
                <Avatar
                  name={displayName(activeConversation.otherParticipant)}
                  src={activeConversation.otherParticipant?.image || undefined}
                  size="md"
                />
                {presence.online ? (
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${onlineDotBorder} ${
                      light ? "bg-emerald-500" : "bg-[#c5f135]"
                    }`}
                  />
                ) : null}
              </div>
              <div className="flex-1">
                <div className={`${titleText} font-semibold text-sm`}>
                  {displayName(activeConversation.otherParticipant)}
                </div>
                <div className={`text-xs ${mutedText}`}>
                  {typingName ? (
                    <span className={accent}>{typingName} yazır...</span>
                  ) : presence.online ? (
                    <span className={accent}>● Online</span>
                  ) : (
                    formatLastSeen(presence.lastSeenAt)
                  )}
                </div>
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto p-5 space-y-3"
            >
              {hasMore ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadOlder}
                    disabled={loadingMore}
                    className={`text-xs ${loadOlderBtn} disabled:opacity-50`}
                  >
                    {loadingMore ? "Yüklənir..." : "Köhnə mesajlar"}
                  </button>
                </div>
              ) : null}

              {loadingMessages ? (
                <p className={`text-center text-sm ${softText}`}>Mesajlar yüklənir...</p>
              ) : (
                messages.map((message) => {
                  const isMine = message.senderId === user.id;
                  return (
                    <div
                      key={`${message.id}-${message.clientMessageId ?? "server"}`}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMine ? myBubble : theirBubble
                        }`}
                      >
                        <div>{message.content}</div>
                        <div
                          className={`text-[10px] mt-1 ${
                            isMine ? myBubbleTime : theirBubbleTime
                          }`}
                        >
                          {formatMessageTime(message.createdAt)}
                          {isMine ? (
                            <span className="ml-1">
                              {message.readByOthers ? "✓✓" : "✓"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {showNewMessageButton ? (
              <button
                type="button"
                onClick={() => scrollToBottom()}
                className={`absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border text-xs font-medium flex items-center gap-2 ${newMsgBtn}`}
              >
                Yeni mesaj
                <ArrowDown size={14} />
              </button>
            ) : null}

            <div className={`px-4 py-3 border-t ${sidebarBorder} ${light ? "bg-white/60 backdrop-blur-sm" : ""}`}>
              <div className={`flex items-end gap-2 border rounded-2xl px-4 py-2.5 ${inputBg}`}>
                <textarea
                  value={messageInput}
                  onChange={(event) => handleInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Mesaj yaz..."
                  className="flex-1 bg-transparent text-sm outline-none resize-none max-h-32"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!messageInput.trim()}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0 ${accentBg}`}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`hidden md:flex flex-1 items-center justify-center ${light ? "bg-white/30" : ""}`}>
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <div className={`${emptyState} text-lg`}>Söhbəti seçin</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
