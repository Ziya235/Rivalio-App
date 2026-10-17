export function createHistoryStore(limit = 10) {
  const chats = new Map();

  return {
    get(chatId) {
      return [...(chats.get(String(chatId)) ?? [])];
    },
    appendExchange(chatId, userText, assistantText) {
      const key = String(chatId);
      const next = [
        ...(chats.get(key) ?? []),
        { role: "user", content: userText },
        { role: "assistant", content: assistantText },
      ];
      chats.set(key, next.slice(-limit));
    },
    reset(chatId) {
      chats.delete(String(chatId));
    },
  };
}
