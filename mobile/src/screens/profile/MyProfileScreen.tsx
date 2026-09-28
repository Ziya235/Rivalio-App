import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { championshipsApi } from "../../api/championships";
import { errorMessage } from "../../api/errors";
import { leaguesApi } from "../../api/leagues";
import { chatApi, friendsApi } from "../../api/people";
import { ChipBar } from "../../components/ChipBar";
import { confirm, pickImage } from "../../components/fields";
import { ScrollScreen } from "../../components/Screen";
import { EmptyState, ErrorState, LoadingView } from "../../components/states";
import { Avatar, Button, Row, SectionTitle, Stat } from "../../components/ui";
import { useAuth, useCurrentUser } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMyTeams } from "../../hooks/useMyTeams";
import { useQuery } from "../../hooks/useQuery";
import { cardShadow, ff, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import { calcAge, formatDate, fullName } from "../../utils/format";
import { championshipPhase, leaguePhase } from "../../utils/status";
import { InfoRows, ProfileHero } from "./ProfileParts";
import { CompetitionList, TeamList } from "./ProfileLists";

type Tab = "info" | "teams" | "leagues" | "championships" | "friends";

export function MyProfileScreen() {
  return <UserProfile />;
}

function OwnHero({ children }: { children?: React.ReactNode }) {
  const user = useCurrentUser();
  const { updateProfileImage } = useAuth();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const age = calcAge(user.dateOfBirth);

  const changePhoto = async () => {
    const image = await pickImage();
    if (!image) return;
    setUploading(true);
    try {
      await updateProfileImage(image);
      toast.success("Profil şəkli yeniləndi");
    } catch (err) {
      toast.error(errorMessage(err, "Şəkil yüklənmədi"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProfileHero
      image={user.image}
      name={fullName(user)}
      sub={`@${user.username}${age != null ? ` · ${age} yaş` : ""}`}
      onPressAvatar={() => void changePhoto()}
      uploading={uploading}
    >
      {children}
    </ProfileHero>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Button
      title="Hesabdan çıx"
      icon="log-out-outline"
      variant="danger"
      style={{ marginTop: spacing.xl }}
      onPress={async () => {
        if (await confirm({ title: "Hesabdan çıxmaq istəyirsiniz?", confirmLabel: "Çıxış", destructive: true })) {
          await logout();
        }
      }}
    />
  );
}

/** Admin account page, opened from the admin Menu. */
export function AdminProfileScreen() {
  const user = useCurrentUser();
  const navigation = useNavigation();
  return (
    <ScrollScreen>
      <OwnHero />
      <InfoRows
        title="Hesab"
        action={{ label: "Redaktə et", onPress: () => navigation.navigate("EditProfile") }}
        rows={[
          ["Email", user.email],
          ["Rol", "Admin"],
          ["Doğum tarixi", formatDate(user.dateOfBirth)],
          ["İcazələr", user.permissions.join(", ")],
        ]}
      />
      <LogoutButton />
    </ScrollScreen>
  );
}

function UserProfile() {
  const user = useCurrentUser();
  const toast = useToast();
  const navigation = useNavigation();
  const { c } = useTheme();
  const styles = useStyles();
  const [tab, setTab] = useState<Tab>("info");
  const [busyId, setBusyId] = useState<number | null>(null);
  const myTeams = useMyTeams();
  const leagues = useQuery(tab === "leagues" ? "leagues:visible" : null, () => leaguesApi.list());
  const champs = useQuery(tab === "championships" ? "championships:all" : null, () => championshipsApi.list({ includeAll: true }));
  const friends = useQuery(tab === "friends" ? "friends" : null, () => friendsApi.list());
  const incoming = useQuery(tab === "friends" ? "friends:incoming" : null, () => friendsApi.incoming());

  const teamIds = useMemo(() => new Set(myTeams.teams.map((t) => t.id)), [myTeams.teams]);
  // Same selection as the web profile page.
  const myLeagues = useMemo(() => {
    const leagueIds = new Set(myTeams.teams.flatMap((t) => (t.leagueMemberships ?? []).map((m) => m.league.id)));
    return (leagues.data ?? []).filter((l) => leagueIds.has(l.id) || l.visibility === "PRIVATE" || l.createdBy.id === user.id);
  }, [leagues.data, myTeams.teams, user.id]);
  const myChamps = useMemo(
    () => (champs.data ?? []).filter((ch) => ch.myTeams?.some((t) => teamIds.has(t.id)) || ch.teams?.some((t) => teamIds.has(t.teamId))),
    [champs.data, teamIds],
  );

  const respondFriend = async (requestId: number, accept: boolean) => {
    setBusyId(requestId);
    try {
      if (accept) await friendsApi.accept(requestId);
      else await friendsApi.reject(requestId);
      toast.success(accept ? "Dostluq qəbul edildi" : "Sorğu rədd edildi");
      await Promise.all([friends.reload(), incoming.reload()]);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const openChat = async (friendId: number) => {
    try {
      const conversation = await chatApi.openDirect(friendId);
      navigation.navigate("ChatThread", { conversationId: conversation.id });
    } catch (err) {
      toast.error(errorMessage(err, "Söhbət açıla bilmədi"));
    }
  };

  const refresh = () => Promise.all([myTeams.refresh(), leagues.refresh(), champs.refresh(), friends.refresh(), incoming.refresh()]);

  return (
    <ScrollScreen refreshing={myTeams.refreshing} onRefresh={() => void refresh()} contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <View style={styles.pad}>
        <OwnHero>
          <Row style={{ alignSelf: "stretch", marginTop: spacing.md }}>
            <Stat label="Oyun" value={user.gamesPlayed} />
            <Stat label="Qol" value={user.goals} accent />
            <Stat label="Asist" value={user.assists} />
          </Row>
        </OwnHero>
      </View>
      <ChipBar
        items={[
          { key: "info", label: "Profil Məlumatları" },
          { key: "teams", label: "Komandalar" },
          { key: "leagues", label: "Liqalar" },
          { key: "championships", label: "Çempionatlar" },
          { key: "friends", label: "Dostlar", count: incoming.data?.length },
        ]}
        active={tab}
        onChange={setTab}
      />
      <View style={styles.pad}>
        {tab === "info" ? (
          <>
            <InfoRows
              title="Şəxsi məlumatlar"
              action={{ label: "Redaktə et", onPress: () => navigation.navigate("EditProfile") }}
              rows={[
                ["Ad", user.firstName],
                ["Soyad", user.lastName],
                ["İstifadəçi adı", user.username],
                ["Email", user.email],
                ["Doğum tarixi", formatDate(user.dateOfBirth)],
                ["Yaş", calcAge(user.dateOfBirth)],
                ["İş yeri", user.workplace],
                ["Oxuduğunuz yer", user.school],
                ["Bio", user.bio],
              ]}
            />
            <LogoutButton />
          </>
        ) : tab === "teams" ? (
          myTeams.loading ? (
            <LoadingView />
          ) : (
            <>
              <SectionTitle count={myTeams.captainTeams.length}>Kapitan olduğum komandalar</SectionTitle>
              <TeamList teams={myTeams.captainTeams.map((t) => ({ ...t, badge: "Kapitan" }))} empty="Kapitanı olduğunuz komanda yoxdur" />
              <SectionTitle count={myTeams.teams.length - myTeams.captainTeams.length}>Üzv olduğum komandalar</SectionTitle>
              <TeamList teams={myTeams.teams.filter((t) => t.captainId !== user.id)} empty="Üzvü olduğunuz komanda yoxdur" />
            </>
          )
        ) : tab === "leagues" ? (
          leagues.loading ? (
            <LoadingView />
          ) : leagues.error ? (
            <ErrorState error={leagues.error} onRetry={leagues.refresh} />
          ) : (
            <CompetitionList
              items={myLeagues.map((l) => ({ id: l.id, name: l.name, logo: l.logo, visibility: l.visibility, phase: leaguePhase(l.status), kind: "league" as const }))}
              empty="Liqa yoxdur"
            />
          )
        ) : tab === "championships" ? (
          champs.loading ? (
            <LoadingView />
          ) : champs.error ? (
            <ErrorState error={champs.error} onRetry={champs.refresh} />
          ) : (
            <CompetitionList
              items={myChamps.map((ch) => ({ id: ch.id, name: ch.name, logo: ch.logo, visibility: ch.visibility, phase: championshipPhase(ch.status), kind: "championship" as const }))}
              empty="Çempionat yoxdur"
            />
          )
        ) : friends.loading ? (
          <LoadingView />
        ) : friends.error ? (
          <ErrorState error={friends.error} onRetry={friends.refresh} />
        ) : (
          <>
            {(incoming.data ?? []).length > 0 ? (
              <>
                <SectionTitle count={incoming.data?.length}>Gələn sorğular</SectionTitle>
                <View style={{ gap: spacing.sm }}>
                  {(incoming.data ?? []).map((r) => (
                    <View key={r.id} style={styles.card}>
                      <Row gap={spacing.md}>
                        <Avatar uri={r.sender.image} name={fullName(r.sender)} size={40} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.friendName}>{fullName(r.sender)}</Text>
                          <Text style={styles.friendSub}>@{r.sender.username}</Text>
                        </View>
                      </Row>
                      <Row style={{ marginTop: spacing.md }}>
                        <Button title="Qəbul et" size="sm" disabled={busyId === r.id} onPress={() => void respondFriend(r.id, true)} style={{ flex: 1 }} />
                        <Button title="Rədd et" size="sm" variant="soft" disabled={busyId === r.id} onPress={() => void respondFriend(r.id, false)} style={{ flex: 1 }} />
                      </Row>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <SectionTitle count={friends.data?.length ?? 0}>Dostlar</SectionTitle>
            {(friends.data ?? []).length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="Hələ dostunuz yoxdur"
                description="Oyunçu axtarışından dostluq sorğusu göndərin."
                action={{ label: "Oyunçu axtar", onPress: () => navigation.navigate("UserSearch") }}
              />
            ) : (
              <View style={styles.list}>
                {(friends.data ?? []).map((f, i) => (
                  <Pressable
                    key={f.friendshipId}
                    onPress={() => navigation.navigate("PlayerProfile", { userId: f.friend.id })}
                    accessibilityRole="button"
                    accessibilityLabel={fullName(f.friend)}
                    style={[styles.listRow, i > 0 && styles.border]}
                  >
                    <Avatar uri={f.friend.image} name={fullName(f.friend)} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{fullName(f.friend)}</Text>
                      <Text style={styles.friendSub}>@{f.friend.username}</Text>
                    </View>
                    <Pressable
                      onPress={() => void openChat(f.friend.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${fullName(f.friend)} ilə mesajlaş`}
                      hitSlop={8}
                      style={styles.chatBtn}
                    >
                      <Ionicons name="chatbubble-outline" size={17} color={c.ink} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  pad: { paddingHorizontal: spacing.lg },
  card: { padding: spacing.lg - 2, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, ...cardShadow(c) },
  list: { borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, ...cardShadow(c) },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60 },
  border: { borderTopWidth: 1, borderTopColor: c.border },
  friendName: { fontSize: 14, fontFamily: ff.bold, color: c.ink },
  friendSub: { fontSize: 12, fontFamily: ff.regular, color: c.textFaint },
  chatBtn: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
}));
