import {
  getOrCreateDirectConversation,
  listConversations,
  getConversationMessages,
  getUnreadPeopleCount,
} from "../services/conversationService.js";

const handleServiceError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

export const createDirectConversation = async (req, res) => {
  try {
    const conversation = await getOrCreateDirectConversation(
      req.user.id,
      req.params.userId,
    );
    return res.json({ success: true, data: conversation });
  } catch (error) {
    console.log("Error in createDirectConversation:", error);
    return handleServiceError(res, error);
  }
};

export const getUnreadPeople = async (req, res) => {
  try {
    const unreadPeopleCount = await getUnreadPeopleCount(
      req.user.id,
      req.query.since,
    );
    return res.json({ success: true, data: { unreadPeopleCount } });
  } catch (error) {
    console.log("Error in getUnreadPeople:", error);
    return handleServiceError(res, error);
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await listConversations(req.user.id);
    return res.json({ success: true, data: conversations });
  } catch (error) {
    console.log("Error in getConversations:", error);
    return handleServiceError(res, error);
  }
};

export const getMessages = async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const { cursor, limit } = req.query;
    const data = await getConversationMessages(req.user.id, conversationId, {
      cursor,
      limit,
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.log("Error in getMessages:", error);
    return handleServiceError(res, error);
  }
};
