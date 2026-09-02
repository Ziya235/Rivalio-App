let io = null;

export const setIo = (instance) => {
  io = instance;
};

export const getIo = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export const emitToConversation = (conversationId, event, payload) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
};
