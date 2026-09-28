import { useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { errorMessage } from "../../api/errors";
import { chatApi, friendsApi } from "../../api/people";
import { confirm } from "../../components/fields";
import { Button, StatusPill } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { useQuery } from "../../hooks/useQuery";
import { spacing } from "../../theme";

/** Friend request / accept / remove / message for another user's profile. */
export function FriendActions({ userId }: { userId: number }) {
  const navigation = useNavigation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data: status, reload } = useQuery(`friend-status:${userId}`, () => friendsApi.status(userId));

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const message = async () => {
    setBusy(true);
    try {
      const conversation = await chatApi.openDirect(userId);
      navigation.navigate("ChatThread", { conversationId: conversation.id });
    } catch (err) {
      toast.error(errorMessage(err, "Söhbət açıla bilmədi"));
    } finally {
      setBusy(false);
    }
  };

  if (!status || status.status === "SELF") return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }}>
      {status.status === "NONE" ? (
        <Button title="Dostluq göndər" icon="person-add" size="sm" loading={busy} onPress={() => void run(() => friendsApi.send(userId), "Dostluq sorğusu göndərildi")} />
      ) : null}
      {status.status === "OUTGOING_PENDING" ? <StatusPill tone="pending" label="Sorğu göndərilib" /> : null}
      {status.status === "INCOMING_PENDING" ? (
        <>
          <Button title="Qəbul et" icon="checkmark" size="sm" variant="success" disabled={busy} onPress={() => void run(() => friendsApi.accept(status.request.id), "Dostluq qəbul edildi")} />
          <Button title="Rədd et" icon="close" size="sm" variant="outline" disabled={busy} onPress={() => void run(() => friendsApi.reject(status.request.id))} />
        </>
      ) : null}
      {status.status === "FRIENDS" ? (
        <>
          <Button title="Mesaj yaz" icon="chatbubble-ellipses" size="sm" disabled={busy} onPress={() => void message()} />
          <Button
            title="Dostluqdan çıxar"
            icon="person-remove-outline"
            size="sm"
            variant="outline"
            disabled={busy}
            onPress={async () => {
              if (await confirm({ title: "Dostluqdan çıxarılsın?", confirmLabel: "Çıxar", destructive: true })) {
                void run(() => friendsApi.remove(userId), "Dostluqdan çıxarıldı");
              }
            }}
          />
        </>
      ) : null}
    </View>
  );
}
