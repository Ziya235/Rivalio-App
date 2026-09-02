import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, UserMinus, UserPlus } from "lucide-react";
import { Button } from "../components/ui";
import {
  acceptFriendRequest,
  fetchFriendshipStatus,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  type FriendshipStatus,
} from "../api/friends";
import { createDirectConversation } from "../api/chat";

type FriendActionsProps = {
  targetUserId: number;
  isSelf?: boolean;
  light?: boolean;
};

export default function FriendActions({
  targetUserId,
  isSelf = false,
  light = false,
}: FriendActionsProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<FriendshipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchFriendshipStatus(targetUserId);
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (isSelf) {
      setLoading(false);
      return;
    }
    loadStatus();
  }, [isSelf, loadStatus]);

  const runAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true);
    setError(null);
    try {
      await action();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Əməliyyat uğursuz oldu");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const conversation = await createDirectConversation(targetUserId);
      navigate(`/chat?conversation=${conversation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Söhbət açıla bilmədi");
    } finally {
      setActionLoading(false);
    }
  };

  if (isSelf || loading) return null;

  const outlineVariant = light ? "outline" : "outline";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {status?.status === "NONE" && (
        <Button
          size="sm"
          disabled={actionLoading}
          onClick={() => runAction(() => sendFriendRequest(targetUserId))}
        >
          <UserPlus size={15} />
          Dostluq göndər
        </Button>
      )}

      {status?.status === "OUTGOING_PENDING" && (
        <Button size="sm" variant={outlineVariant} disabled>
          Sorğu göndərilib
        </Button>
      )}

      {status?.status === "INCOMING_PENDING" && (
        <>
          <Button
            size="sm"
            disabled={actionLoading}
            onClick={() =>
              runAction(() => acceptFriendRequest(status.request.id))
            }
          >
            Qəbul et
          </Button>
          <Button
            size="sm"
            variant={outlineVariant}
            disabled={actionLoading}
            onClick={() =>
              runAction(() => rejectFriendRequest(status.request.id))
            }
          >
            Rədd et
          </Button>
        </>
      )}

      {status?.status === "FRIENDS" && (
        <>
          <Button size="sm" disabled={actionLoading} onClick={handleMessage}>
            <MessageCircle size={15} />
            Mesaj yaz
          </Button>
          <Button
            size="sm"
            variant={outlineVariant}
            disabled={actionLoading}
            onClick={() => runAction(() => removeFriend(targetUserId))}
          >
            <UserMinus size={15} />
            Dostluqdan çıxar
          </Button>
        </>
      )}

      {error ? <p className="w-full text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
