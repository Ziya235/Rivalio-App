import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { championshipsApi } from "../../api/championships";
import { errorMessage } from "../../api/errors";
import { adminLeaguesApi } from "../../api/leagues";
import { friendsApi } from "../../api/people";
import { challengesApi, playerSearchApi } from "../../api/social";
import { teamsApi } from "../../api/teams";
import { adminChampionshipsApi } from "../../api/championships";
import { Screen, useRefreshTint } from "../../components/Screen";
import { EmptyState, ErrorState, SkeletonList } from "../../components/states";
import { Avatar, Button, IconTile, Row, StatusPill, type IconName } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useRealtime, useSocketEvent } from "../../context/RealtimeContext";
import { useToast } from "../../context/ToastContext";
import { useQuery } from "../../hooks/useQuery";
import { ff, font, radius, spacing, type Tone } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { RequestStatus } from "../../types/common";
import type { AppNotification } from "../../types/notification";
import type { ChallengeRequestNotice, PlayerSearchRequestNotice } from "../../types/social";
import type { TeamPlayerInvite } from "../../types/team";
import { formatDateTime, formatRelative, fullName } from "../../utils/format";
import { notificationOutcome, notificationText, pendingAction } from "../../utils/notifications";

type Entry =
  | { key: string; at: number; kind: "social"; n: AppNotification }
  | { key: string; at: number; kind: "player"; r: PlayerSearchRequestNotice; incoming: boolean }
  | { key: string; at: number; kind: "challenge"; r: ChallengeRequestNotice; incoming: boolean }
  | { key: string; at: number; kind: "teamPlayer"; r: TeamPlayerInvite; incoming: boolean };

const ts = (iso: string | null | undefined) => (iso ? Date.parse(iso) || 0 : 0);

function outcomeOf(status: RequestStatus): "accepted" | "rejected" | null {
  if (status === "ACCEPTED") return "accepted";
  if (status === "REJECTED" || status === "CANCELLED") return "rejected";
  return null;
}

export function NotificationsScreen() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigation = useNavigation();
  const rt = useRealtime();
  const styles = useStyles();
  const refreshTint = useRefreshTint();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Request-style notices live in their own endpoints (not in /api/notifications).
  const extras = useQuery(isAdmin ? null : "notifications:extras", async () => {
    const [player, challenge, teamPlayer] = await Promise.all([
      playerSearchApi.notifications(),
      challengesApi.notifications(),
      teamsApi.playerInviteNotifications(),
    ]);
    return { player, challenge, teamPlayer };
  });

  useSocketEvent("social_requests_changed", () => void extras.reload(), !isAdmin);
  // New server notifications may relate to request entries too.
  useEffect(() => {
    if (!isAdmin) void extras.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt.notifications.length]);

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = rt.notifications.map((n) => ({ key: `n-${n.id}`, at: ts(n.createdAt), kind: "social", n }));
    const e = extras.data;
    if (e) {
      e.player.incoming.forEach((r) => list.push({ key: `pi-${r.id}`, at: ts(r.createdAt), kind: "player", r, incoming: true }));
      e.player.outcomes.forEach((r) => list.push({ key: `po-${r.id}`, at: ts(r.respondedAt ?? r.createdAt), kind: "player", r, incoming: false }));
      e.challenge.incoming.forEach((r) => list.push({ key: `ci-${r.id}`, at: ts(r.createdAt), kind: "challenge", r, incoming: true }));
      e.challenge.outcomes.forEach((r) => list.push({ key: `co-${r.id}`, at: ts(r.respondedAt ?? r.createdAt), kind: "challenge", r, incoming: false }));
      e.teamPlayer.incoming.forEach((r) => list.push({ key: `ti-${r.id}`, at: ts(r.createdAt), kind: "teamPlayer", r, incoming: true }));
      e.teamPlayer.outcomes.forEach((r) => list.push({ key: `to-${r.id}`, at: ts(r.respondedAt ?? r.createdAt), kind: "teamPlayer", r, incoming: false }));
    }
    return list.sort((a, b) => b.at - a.at);
  }, [rt.notifications, extras.data]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([rt.refreshNotifications(), extras.refresh()]);
    setRefreshing(false);
  }, [rt, extras]);

  const act = async (key: string, action: () => Promise<unknown>, success: string, after: () => Promise<unknown>) => {
    setBusyKey(key);
    try {
      await action();
      toast.success(success);
      await after();
    } catch (err) {
      toast.error(errorMessage(err, "Əməliyyat alınmadı"));
    } finally {
      setBusyKey(null);
    }
  };

  const respondSocial = (n: AppNotification, accept: boolean) => {
    const kind = pendingAction(n, isAdmin);
    const id = Number(n.entityId);
    if (!kind || !id) return;
    const verb = accept ? "accept" : "reject";
    const status: RequestStatus = accept ? "ACCEPTED" : "REJECTED";
    void act(
      `n-${n.id}`,
      async () => {
        if (kind === "friend") await (accept ? friendsApi.accept(id) : friendsApi.reject(id));
        else if (kind === "championshipInvite") await championshipsApi.respondInvite(id, verb);
        else if (kind === "leagueInvite") await teamsApi.respondLeagueInvite(id, verb);
        else if (kind === "leagueJoin") await adminLeaguesApi.respondJoinRequest(id, verb);
        else await adminChampionshipsApi.respondJoinRequest(id, verb);
        const patch: Partial<AppNotification> =
          kind === "friend"
            ? { friendRequestStatus: status }
            : kind === "championshipInvite"
              ? { championshipInviteStatus: status }
              : kind === "leagueInvite"
                ? { leagueInviteStatus: status }
                : kind === "leagueJoin"
                  ? { joinRequestStatus: status }
                  : { championshipJoinRequestStatus: status };
        rt.patchNotification(n.id, patch);
        await rt.markNotificationRead(n.id);
      },
      accept ? "Qəbul edildi" : "Rədd edildi",
      rt.refreshNotifications,
    );
  };

  const openSocial = (n: AppNotification) => {
    if (!n.isRead) void rt.markNotificationRead(n.id);
    if (n.actor && (n.type === "FRIEND_REQUEST" || n.type === "FRIEND_ACCEPTED") && !isAdmin) {
      navigation.navigate("PlayerProfile", { userId: n.actor.id });
      return;
    }
    const leagueId = n.leagueInvite?.league.id ?? n.joinRequest?.league.id;
    const champId = n.championshipInvite?.championship.id ?? n.championshipJoinRequest?.championship.id;
    if (leagueId) navigation.navigate(isAdmin ? "AdminLeagueDetail" : "LeagueDetail", { leagueId });
    else if (champId) {
      if (isAdmin) navigation.navigate("AdminChampionship", { championshipId: champId });
      else navigation.navigate("ChampionshipDetail", { championshipId: champId });
    }
  };

  const renderItem = ({ item }: { item: Entry }) => {
    if (item.kind === "social") {
      const n = item.n;
      const pending = pendingAction(n, isAdmin);
      const outcome = notificationOutcome(n);
      return (
        <Item
          icon={n.type === "FRIEND_REQUEST" || n.type === "FRIEND_ACCEPTED" ? "person-add-outline" : n.type === "NEW_MESSAGE" ? "chatbubble-outline" : "trophy-outline"}
          tone={n.type === "FRIEND_REQUEST" || n.type === "FRIEND_ACCEPTED" ? "blue" : n.type === "NEW_MESSAGE" ? "violet" : "lime"}
          unread={!n.isRead}
          avatar={n.actor ? { uri: n.actor.image, name: fullName(n.actor) } : undefined}
          actor={n.actor ? fullName(n.actor) : "Rivalio"}
          text={notificationText(n)}
          at={n.createdAt}
          onPress={() => openSocial(n)}
          pending={pending != null}
          busy={busyKey === `n-${n.id}`}
          outcome={pending ? null : outcome}
          onAccept={() => respondSocial(n, true)}
          onReject={() => respondSocial(n, false)}
        />
      );
    }
    if (item.kind === "player") {
      const r = item.r;
      const pending = item.incoming && r.status === "PENDING";
      const text = item.incoming
        ? r.status === "ACCEPTED"
          ? "oyunçu axtarışı sorğusunu qəbul etdiniz"
          : r.status === "REJECTED"
            ? "oyunçu axtarışı sorğusunu rədd etdiniz"
            : "komandanızın oyunçu axtarışına qoşulmaq istəyir"
        : r.status === "ACCEPTED"
          ? "oyunçu axtarışı sorğunuzu qəbul etdi"
          : r.status === "CANCELLED"
            ? "oyunçu axtarışını bağladı"
            : "oyunçu axtarışı sorğunuzu rədd etdi";
      return (
        <Item
          icon="person-add-outline"
          tone="violet"
          avatar={item.incoming && r.user ? { uri: r.user.image, name: fullName(r.user) } : undefined}
          actor={item.incoming ? fullName(r.user) : r.playerSearch.hostTeam.name}
          text={text}
          extra={`${r.playerSearch.venue} · ${formatDateTime(r.playerSearch.scheduledAt)}`}
          at={r.createdAt}
          pending={pending}
          busy={busyKey === `p-${r.id}`}
          outcome={pending ? null : outcomeOf(r.status)}
          onAccept={() => void act(`p-${r.id}`, () => playerSearchApi.respond(r.id, "accept"), "Qəbul edildi", extras.reload)}
          onReject={() => void act(`p-${r.id}`, () => playerSearchApi.respond(r.id, "reject"), "Rədd edildi", extras.reload)}
        />
      );
    }
    if (item.kind === "challenge") {
      const r = item.r;
      const pending = item.incoming && r.status === "PENDING";
      const text = item.incoming
        ? r.status === "PENDING"
          ? "oyun təklifinizə sorğu göndərdi"
          : r.status === "ACCEPTED"
            ? "oyun təklifi sorğusunu qəbul etdiniz"
            : "oyun təklifi sorğusunu rədd etdiniz"
        : r.status === "ACCEPTED"
          ? "oyun təklifi sorğunuzu qəbul etdi"
          : "oyun təklifi sorğunuzu rədd etdi";
      return (
        <Item
          icon="flash-outline"
          tone="orange"
          avatar={{ uri: item.incoming ? r.team.logo : r.challenge.team.logo, name: item.incoming ? r.team.name : r.challenge.team.name }}
          actor={item.incoming ? r.team.name : r.challenge.team.name}
          text={text}
          extra={`${r.challenge.venue} · ${formatDateTime(r.challenge.scheduledAt)}`}
          at={r.createdAt}
          pending={pending}
          busy={busyKey === `c-${r.id}`}
          outcome={pending ? null : outcomeOf(r.status)}
          onAccept={() => void act(`c-${r.id}`, () => challengesApi.respond(r.id, "accept"), "Oyun təklifi qəbul edildi", extras.reload)}
          onReject={() => void act(`c-${r.id}`, () => challengesApi.respond(r.id, "reject"), "Rədd edildi", extras.reload)}
        />
      );
    }
    const r = item.r;
    const pending = item.incoming && r.status === "PENDING";
    return (
      <Item
        icon="shirt-outline"
        tone="blue"
        avatar={{ uri: r.team.logo, name: r.team.name }}
        actor={item.incoming ? r.team.name : fullName(r.invitedUser)}
        text={
          item.incoming
            ? r.status === "PENDING"
              ? `komandasına qoşulmağa dəvət edir${r.message ? ` · “${r.message}”` : ""}`
              : r.status === "ACCEPTED"
                ? "komanda dəvətini qəbul etdiniz"
                : "komanda dəvətini rədd etdiniz"
            : `${r.team.name} komandasına dəvəti ${r.status === "ACCEPTED" ? "qəbul etdi" : "rədd etdi"}`
        }
        at={r.createdAt}
        pending={pending}
        busy={busyKey === `t-${r.id}`}
        outcome={pending ? null : outcomeOf(r.status)}
        onAccept={() => void act(`t-${r.id}`, () => teamsApi.respondPlayerInvite(r.id, "accept"), "Komandaya qoşuldunuz", extras.reload)}
        onReject={() => void act(`t-${r.id}`, () => teamsApi.respondPlayerInvite(r.id, "reject"), "Dəvət rədd edildi", extras.reload)}
      />
    );
  };

  const loading = entries.length === 0 && (extras.loading || !rt.isConnected) && !extras.error;

  return (
    <Screen>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.key}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} {...refreshTint} />}
        ListHeaderComponent={
          rt.unreadCount > 0 ? (
            <Row style={styles.header}>
              <Text style={styles.headerText}>Bütün bildirişlər tarixə görə, ən yenilər üstdə · {rt.unreadCount} oxunmamış</Text>
              <Button
                title="Hamısını oxu"
                icon="checkmark-done"
                size="sm"
                variant="outline"
                onPress={() => void rt.markAllNotificationsRead().catch((err) => toast.error(errorMessage(err)))}
              />
            </Row>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList />
          ) : extras.error ? (
            <ErrorState error={extras.error} onRetry={() => void refresh()} />
          ) : (
            <EmptyState icon="notifications-off-outline" title="Bildiriş yoxdur" description="Yeni sorğular və dəvətlər burada görünəcək." />
          )
        }
      />
    </Screen>
  );
}

function Item({
  icon,
  tone = "lime",
  avatar,
  actor,
  text,
  extra,
  at,
  unread,
  pending,
  busy,
  outcome,
  onPress,
  onAccept,
  onReject,
}: {
  icon: IconName;
  tone?: Tone;
  avatar?: { uri: string | null | undefined; name: string };
  actor: string;
  text: string;
  extra?: string;
  at: string;
  unread?: boolean;
  pending: boolean;
  busy: boolean;
  outcome: "accepted" | "rejected" | null;
  onPress?: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const resolved = !pending && outcome != null;
  return (
    <View style={[styles.item, unread && styles.unread]}>
      <Row gap={spacing.md} style={{ alignItems: "flex-start" }}>
        <View>
          {avatar?.uri ? <Avatar uri={avatar.uri} name={avatar.name} size={40} /> : <IconTile icon={icon} tone={resolved ? "gray" : tone} size={40} />}
        </View>
        <View style={{ flex: 1, paddingRight: unread ? 12 : 0 }}>
          <Text style={[styles.text, resolved && { color: c.textMuted }]} onPress={onPress} accessibilityRole={onPress ? "button" : undefined}>
            <Text style={styles.actor}>{actor}</Text> {text}
          </Text>
          {extra ? (
            <View style={styles.extra}>
              <Ionicons name="location-outline" size={12} color={c.textMuted} />
              <Text style={styles.extraText} numberOfLines={1}>
                {extra}
              </Text>
            </View>
          ) : null}
          <Text style={styles.time}>{formatRelative(at)}</Text>
        </View>
        {unread ? <View style={styles.dot} accessibilityLabel="Oxunmayıb" /> : null}
      </Row>
      {pending ? (
        <Row style={styles.actions}>
          <Button title="Qəbul et" size="sm" disabled={busy} onPress={onAccept} style={{ flex: 1 }} />
          <Button title="Rədd et" size="sm" variant="soft" disabled={busy} onPress={onReject} style={{ flex: 1 }} />
        </Row>
      ) : outcome ? (
        <View style={[styles.actions, { marginLeft: 52 }]}>
          <StatusPill tone={outcome} label={outcome === "accepted" ? "Qəbul edildi" : "Rədd edildi"} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  header: { marginBottom: spacing.md, gap: spacing.md },
  headerText: { flex: 1, fontSize: 12, fontFamily: ff.regular, color: c.textMuted },
  item: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
  },
  unread: { borderColor: c.brandBorder },
  text: { fontSize: font.sm + 0.5, fontFamily: ff.regular, color: c.text, lineHeight: 20 },
  actor: { fontFamily: ff.bold, color: c.ink },
  extra: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  extraText: { flex: 1, fontSize: 12, fontFamily: ff.regular, color: c.textMuted },
  time: { fontSize: 11.5, fontFamily: ff.regular, color: c.textFaint, marginTop: 5 },
  dot: { position: "absolute", top: 4, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand },
  actions: { marginTop: spacing.md, gap: spacing.sm },
}));
