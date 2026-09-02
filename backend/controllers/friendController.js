import {
  sendFriendRequest,
  listIncomingRequests,
  listOutgoingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  listFriends,
  removeFriend,
  getFriendshipStatus,
} from "../services/friendService.js";

const handleServiceError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

export const createFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const request = await sendFriendRequest(req.user.id, receiverId);
    return res.status(201).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.log("Error in createFriendRequest:", error);
    return handleServiceError(res, error);
  }
};

export const getIncomingFriendRequests = async (req, res) => {
  try {
    const requests = await listIncomingRequests(req.user.id);
    return res.json({ success: true, data: requests });
  } catch (error) {
    console.log("Error in getIncomingFriendRequests:", error);
    return handleServiceError(res, error);
  }
};

export const getOutgoingFriendRequests = async (req, res) => {
  try {
    const requests = await listOutgoingRequests(req.user.id);
    return res.json({ success: true, data: requests });
  } catch (error) {
    console.log("Error in getOutgoingFriendRequests:", error);
    return handleServiceError(res, error);
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const result = await acceptFriendRequest(req.user.id, requestId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.log("Error in acceptRequest:", error);
    return handleServiceError(res, error);
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const request = await rejectFriendRequest(req.user.id, requestId);
    return res.json({ success: true, data: request });
  } catch (error) {
    console.log("Error in rejectRequest:", error);
    return handleServiceError(res, error);
  }
};

export const getFriends = async (req, res) => {
  try {
    const friends = await listFriends(req.user.id);
    return res.json({ success: true, data: friends });
  } catch (error) {
    console.log("Error in getFriends:", error);
    return handleServiceError(res, error);
  }
};

export const deleteFriend = async (req, res) => {
  try {
    const result = await removeFriend(req.user.id, req.params.userId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.log("Error in deleteFriend:", error);
    return handleServiceError(res, error);
  }
};

export const getFriendStatus = async (req, res) => {
  try {
    const status = await getFriendshipStatus(req.user.id, req.params.userId);
    return res.json({ success: true, data: status });
  } catch (error) {
    console.log("Error in getFriendStatus:", error);
    return handleServiceError(res, error);
  }
};
