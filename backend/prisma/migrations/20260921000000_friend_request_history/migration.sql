-- Allow multiple historical friend requests between the same pair so a
-- rejected request keeps its status when a new one is sent later.
DROP INDEX "FriendRequest_senderId_receiverId_key";

CREATE INDEX "FriendRequest_senderId_receiverId_idx" ON "FriendRequest"("senderId", "receiverId");
