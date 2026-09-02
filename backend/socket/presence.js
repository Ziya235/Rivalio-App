const userConnections = new Map();

export const addConnection = (userId, socketId) => {
  const key = Number(userId);
  const set = userConnections.get(key) ?? new Set();
  set.add(socketId);
  userConnections.set(key, set);
};

export const removeConnection = (userId, socketId) => {
  const key = Number(userId);
  const set = userConnections.get(key);
  if (!set) return 0;
  set.delete(socketId);
  if (set.size === 0) {
    userConnections.delete(key);
    return 0;
  }
  userConnections.set(key, set);
  return set.size;
};

export const getConnectionCount = (userId) =>
  userConnections.get(Number(userId))?.size ?? 0;

export const isUserOnline = (userId) => getConnectionCount(userId) > 0;

export const getOnlineUserIds = () => Array.from(userConnections.keys());
