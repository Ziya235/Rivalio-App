const conversationRooms = new Map();

export const trackConversationViewer = (userId, conversationId, active) => {
  const convId = Number(conversationId);
  const uid = Number(userId);
  const users = conversationRooms.get(convId) ?? new Set();

  if (active) {
    users.add(uid);
  } else {
    users.delete(uid);
  }

  if (users.size === 0) {
    conversationRooms.delete(convId);
  } else {
    conversationRooms.set(convId, users);
  }
};

export const isUserInConversationRoom = (userId, conversationId) => {
  const users = conversationRooms.get(Number(conversationId));
  return users?.has(Number(userId)) ?? false;
};

export const clearUserFromConversationRooms = (userId) => {
  const uid = Number(userId);
  for (const [conversationId, users] of conversationRooms.entries()) {
    users.delete(uid);
    if (users.size === 0) {
      conversationRooms.delete(conversationId);
    }
  }
};
