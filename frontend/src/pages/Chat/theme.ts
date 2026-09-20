export type ChatTheme = ReturnType<typeof getChatTheme>;

export function getChatTheme(light: boolean) {
  return {
    bg: light
      ? "[background:linear-gradient(135deg,#E8FFF3_0%,#EAF8FF_48%,#F2EDFF_100%)]"
      : "bg-[#08080e]",
    sidebarBorder: light ? "border-gray-200" : "border-white/7",
    panelBg: light ? "bg-white/80 backdrop-blur-sm" : "bg-transparent",
    threadBg: light ? "bg-white/40" : "",
    headerBg: light ? "bg-white/60 backdrop-blur-sm" : "",
    emptyPaneBg: light ? "bg-white/30" : "",
    titleText: light ? "text-gray-900" : "text-white",
    mutedText: light ? "text-gray-500" : "text-white/45",
    softText: light ? "text-gray-400" : "text-white/35",
    inputBg: light
      ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
      : "bg-[#18181f] border-white/10 text-white placeholder-white/30",
    searchIcon: light ? "text-gray-400" : "text-white/30",
    listHover: light ? "hover:bg-gray-100" : "hover:bg-white/4",
    listActive: light
      ? "bg-emerald-500/10 border-r-2 border-emerald-500"
      : "bg-[#c5f135]/5 border-r-2 border-[#c5f135]",
    onlineDot: light ? "bg-emerald-500" : "bg-[#c5f135]",
    onlineDotBorder: light ? "border-white" : "border-[#08080e]",
    accent: light ? "text-emerald-600" : "text-[#c5f135]",
    accentBg: light
      ? "bg-emerald-500 text-white hover:bg-emerald-600"
      : "bg-[#c5f135] text-[#08080e] hover:bg-[#d4f55a]",
    unreadBadge: light
      ? "bg-emerald-500 text-white"
      : "bg-[#c5f135] text-[#08080e]",
    theirBubble: light
      ? "bg-white text-gray-900 border border-gray-200 rounded-tl-sm shadow-sm"
      : "bg-[#18181f] text-white border border-white/7 rounded-tl-sm",
    theirBubbleTime: light ? "text-gray-400" : "text-white/30",
    myBubble: light
      ? "bg-emerald-500 text-white rounded-tr-sm"
      : "bg-[#c5f135] text-[#08080e] rounded-tr-sm",
    myBubbleTime: light
      ? "text-white/70 text-right"
      : "text-[#08080e]/60 text-right",
    emptyState: light ? "text-gray-400" : "text-white/50",
    newMsgBtn: light
      ? "bg-white border-gray-200 text-gray-700 shadow-md"
      : "bg-[#18181f] border-white/10 text-white shadow-lg",
    backBtn: light
      ? "text-gray-500 hover:text-gray-900"
      : "text-white/50 hover:text-white",
    loadOlderBtn: light
      ? "text-gray-500 hover:text-gray-800"
      : "text-white/45 hover:text-white/70",
  };
}
