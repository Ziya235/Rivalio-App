import { useMemo } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { AppOutletContext } from "../../App";
import { ChatThread, FriendSidebar } from "./components";
import { getChatTheme } from "./theme";
import { useChat } from "./useChat";

export default function ChatPage() {
  const { isDarkMode } = useOutletContext<AppOutletContext>();
  const light = !isDarkMode;
  const theme = useMemo(() => getChatTheme(light), [light]);
  const chat = useChat();

  if (chat.authLoading) {
    return (
      <div className={`${theme.bg} min-h-screen pt-24 text-center ${theme.softText}`}>
        Yüklənir...
      </div>
    );
  }

  if (!chat.user) return <Navigate to="/login" replace />;

  return (
    <div className={`${theme.bg} min-h-screen pt-16 transition-colors duration-300`}>
      <div className="max-w-[1280px] mx-auto h-[calc(100vh-64px)] flex">
        <FriendSidebar
          theme={theme}
          search={chat.search}
          onSearchChange={chat.setSearch}
          loading={chat.loadingSidebar}
          items={chat.friendItems}
          activeFriendId={chat.activeFriendId}
          openingFriendId={chat.openingFriendId}
          onlineUsers={chat.onlineUsers}
          hiddenOnMobile={chat.mobileView === "chat"}
          onSelect={(friendId) => void chat.openChatWithFriend(friendId)}
        />

        {chat.activeConversation ? (
          <ChatThread
            theme={theme}
            conversation={chat.activeConversation}
            messages={chat.messages}
            currentUserId={chat.user.id}
            presence={chat.presence}
            typingName={chat.typingName}
            hasMore={chat.hasMore}
            loadingMessages={chat.loadingMessages}
            loadingMore={chat.loadingMore}
            showNewMessageButton={chat.showNewMessageButton}
            messageInput={chat.messageInput}
            hiddenOnMobile={chat.mobileView === "list"}
            messagesContainerRef={chat.messagesContainerRef}
            messagesEndRef={chat.messagesEndRef}
            onBack={() => chat.setMobileView("list")}
            onScroll={chat.handleMessagesScroll}
            onLoadOlder={() => void chat.handleLoadOlder()}
            onScrollToBottom={() => chat.scrollToBottom()}
            onInputChange={chat.handleInputChange}
            onSend={chat.handleSend}
          />
        ) : (
          <div
            className={`${chat.mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 items-center justify-center relative ${theme.emptyPaneBg}`}
          >
            <button
              type="button"
              onClick={() => chat.setMobileView("list")}
              className={`md:hidden absolute top-4 left-4 p-1.5 ${theme.backBtn}`}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <div className={`${theme.emptyState} text-lg`}>
                {chat.openingFriendId
                  ? "Söhbət açılır..."
                  : "Mesaj yazmaq üçün dostunu seç"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
