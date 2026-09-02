import { io, type Socket } from "socket.io-client";
import { getToken } from "../api/auth";

let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Promise<Socket> {
  const token = getToken();
  if (!token) {
    return Promise.reject(new Error("No auth token"));
  }

  if (socket?.connected) {
    return Promise.resolve(socket);
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = new Promise((resolve, reject) => {
    const instance = io(window.location.origin, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });

    const onConnect = () => {
      cleanup();
      socket = instance;
      connectPromise = null;
      resolve(instance);
    };

    const onConnectError = (error: Error) => {
      cleanup();
      connectPromise = null;
      instance.disconnect();
      reject(error);
    };

    const cleanup = () => {
      instance.off("connect", onConnect);
      instance.off("connect_error", onConnectError);
    };

    instance.on("connect", onConnect);
    instance.on("connect_error", onConnectError);
  });

  return connectPromise;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  connectPromise = null;
}

export function subscribeSocketEvent<T>(
  event: string,
  handler: (payload: T) => void,
): () => void {
  if (!socket) return () => undefined;
  socket.on(event, handler);
  return () => {
    socket?.off(event, handler);
  };
}

export function emitSocketEvent(event: string, payload?: unknown): void {
  socket?.emit(event, payload);
}

export function joinConversation(conversationId: number): void {
  emitSocketEvent("join_conversation", { conversationId });
}

export function leaveConversation(conversationId: number): void {
  emitSocketEvent("leave_conversation", { conversationId });
}

export function sendChatMessage(payload: {
  conversationId: number;
  content: string;
  clientMessageId?: string;
}): void {
  emitSocketEvent("send_message", payload);
}

export function markMessagesReadSocket(
  conversationId: number,
  upToMessageId?: number,
): void {
  emitSocketEvent("mark_messages_read", { conversationId, upToMessageId });
}

export function emitTypingStart(conversationId: number): void {
  emitSocketEvent("typing_start", { conversationId });
}

export function emitTypingStop(conversationId: number): void {
  emitSocketEvent("typing_stop", { conversationId });
}
