import type { RefObject } from "react";
import { ArrowDown, ArrowLeft, Send } from "lucide-react";
import { Avatar } from "../../../components/ui";
import type { ChatMessage, ConversationSummary } from "../../../api/chat";
import type { ChatTheme } from "../theme";
import { displayName, formatLastSeen, formatMessageTime } from "../helpers";

export function ChatThread({
  theme,
  conversation,
  messages,
  currentUserId,
  presence,
  typingName,
  hasMore,
  loadingMessages,
  loadingMore,
  showNewMessageButton,
  messageInput,
  hiddenOnMobile,
  messagesContainerRef,
  messagesEndRef,
  onBack,
  onScroll,
  onLoadOlder,
  onScrollToBottom,
  onInputChange,
  onSend,
}: {
  theme: ChatTheme;
  conversation: ConversationSummary;
  messages: ChatMessage[];
  currentUserId: number;
  presence: { online: boolean; lastSeenAt: string | null };
  typingName: string | null;
  hasMore: boolean;
  loadingMessages: boolean;
  loadingMore: boolean;
  showNewMessageButton: boolean;
  messageInput: string;
  hiddenOnMobile: boolean;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onScroll: () => void;
  onLoadOlder: () => void;
  onScrollToBottom: () => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
}) {
  const name = displayName(conversation.otherParticipant);

  return (
    <div
      className={`${hiddenOnMobile ? "hidden" : "flex"} md:flex flex-col flex-1 min-w-0 relative ${theme.threadBg}`}
    >
      <div
        className={`px-5 py-3.5 border-b ${theme.sidebarBorder} flex items-center gap-3 ${theme.headerBg}`}
      >
        <button
          type="button"
          onClick={onBack}
          className={`md:hidden p-1.5 ${theme.backBtn}`}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="relative">
          <Avatar
            name={name}
            src={conversation.otherParticipant?.image || undefined}
            size="md"
          />
          {presence.online ? (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${theme.onlineDotBorder} ${theme.onlineDot}`}
            />
          ) : null}
        </div>
        <div className="flex-1">
          <div className={`${theme.titleText} font-semibold text-sm`}>{name}</div>
          <div className={`text-xs ${theme.mutedText}`}>
            {typingName ? (
              <span className={theme.accent}>{typingName} yazır...</span>
            ) : presence.online ? (
              <span className={theme.accent}>● Online</span>
            ) : (
              formatLastSeen(presence.lastSeenAt)
            )}
          </div>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-5 space-y-3"
      >
        {hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingMore}
              className={`text-xs ${theme.loadOlderBtn} disabled:opacity-50`}
            >
              {loadingMore ? "Yüklənir..." : "Köhnə mesajlar"}
            </button>
          </div>
        ) : null}

        {loadingMessages ? (
          <p className={`text-center text-sm ${theme.softText}`}>
            Mesajlar yüklənir...
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <div
                key={`${message.id}-${message.clientMessageId ?? "server"}`}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine ? theme.myBubble : theme.theirBubble
                  }`}
                >
                  <div>{message.content}</div>
                  <div
                    className={`text-[10px] mt-1 ${
                      isMine ? theme.myBubbleTime : theme.theirBubbleTime
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
          onClick={onScrollToBottom}
          className={`absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border text-xs font-medium flex items-center gap-2 ${theme.newMsgBtn}`}
        >
          Yeni mesaj
          <ArrowDown size={14} />
        </button>
      ) : null}

      <div className={`px-4 py-3 border-t ${theme.sidebarBorder} ${theme.headerBg}`}>
        <div
          className={`flex items-end gap-2 border rounded-2xl px-4 py-2.5 ${theme.inputBg}`}
        >
          <textarea
            value={messageInput}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder="Mesaj yaz..."
            className="flex-1 bg-transparent text-sm outline-none resize-none max-h-32"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!messageInput.trim()}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0 ${theme.accentBg}`}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
