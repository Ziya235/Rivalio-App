import { Search } from "lucide-react";
import { Avatar } from "../../../components/ui";
import type { ChatTheme } from "../theme";
import { displayName, formatListTime, type FriendChatItem } from "../helpers";

export function FriendSidebar({
  theme,
  search,
  onSearchChange,
  loading,
  items,
  activeFriendId,
  openingFriendId,
  onlineUsers,
  hiddenOnMobile,
  onSelect,
}: {
  theme: ChatTheme;
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  items: FriendChatItem[];
  activeFriendId: number | null;
  openingFriendId: number | null;
  onlineUsers: Record<number, boolean>;
  hiddenOnMobile: boolean;
  onSelect: (friendId: number) => void;
}) {
  return (
    <div
      className={`${hiddenOnMobile ? "hidden" : "flex"} md:flex flex-col w-full md:w-80 lg:w-96 border-r ${theme.sidebarBorder} flex-shrink-0 ${theme.panelBg}`}
    >
      <div className={`p-4 border-b ${theme.sidebarBorder}`}>
        <h2 className={`font-display text-2xl font-700 ${theme.titleText} mb-1`}>
          Dostlar
        </h2>
        <p className={`text-xs ${theme.mutedText} mb-3`}>
          Mesaj yazmaq üçün dostunu seç
        </p>
        <div className="relative">
          <Search
            size={14}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.searchIcon}`}
          />
          <input
            type="text"
            placeholder="Dost axtar..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className={`w-full border rounded-xl pl-9 pr-4 py-2 text-sm ${theme.inputBg}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className={`px-4 py-6 text-sm ${theme.softText}`}>Yüklənir...</p>
        ) : items.length === 0 ? (
          <p className={`px-4 py-6 text-sm ${theme.softText}`}>
            {search.trim()
              ? "Nəticə tapılmadı"
              : "Hələ dostunuz yoxdur"}
          </p>
        ) : (
          items.map((item) => {
            const name = displayName(item.friend);
            const online = Boolean(onlineUsers[item.friend.id]);
            const isActive = activeFriendId === item.friend.id;
            const isOpening = openingFriendId === item.friend.id;

            return (
              <button
                key={item.friend.id}
                type="button"
                disabled={isOpening}
                onClick={() => onSelect(item.friend.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 ${theme.listHover} transition-colors text-left disabled:opacity-60 ${
                  isActive ? theme.listActive : ""
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    name={name}
                    src={item.friend.image || undefined}
                    size="md"
                  />
                  {online ? (
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${theme.onlineDotBorder} ${theme.onlineDot}`}
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`${theme.titleText} text-sm font-semibold truncate`}
                    >
                      {name}
                    </span>
                    {item.conversation ? (
                      <span className={`${theme.softText} text-xs flex-shrink-0`}>
                        {formatListTime(item.conversation.lastMessageAt)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${theme.mutedText} text-xs truncate`}>
                      {isOpening
                        ? "Söhbət açılır..."
                        : item.conversation?.lastMessage?.content ||
                          "Mesaj yaz"}
                    </span>
                    {item.conversation && item.conversation.unreadCount > 0 ? (
                      <span
                        className={`ml-2 min-w-[18px] h-[18px] ${theme.unreadBadge} text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0`}
                      >
                        {item.conversation.unreadCount}
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
  );
}
