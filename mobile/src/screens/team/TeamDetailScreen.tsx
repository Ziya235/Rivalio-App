import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../../api/errors";
import { usersApi } from "../../api/people";
import { teamsApi } from "../../api/teams";
import { BottomSheet } from "../../components/BottomSheet";
import { confirm } from "../../components/fields";
import { ScrollScreen } from "../../components/Screen";
import { ErrorState, LoadingView } from "../../components/states";
import { Avatar, Button, Meta, Muted, Pill, Row, SectionTitle, Stat, TeamCrest, TextField, Title } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDebouncedValue } from "../../hooks/timers";
import { invalidateQueries, useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { cardShadow, ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { UserSearchHit } from "../../types/player";
import { fullName } from "../../utils/format";
import { championshipPhase, PHASE_LABEL, PHASE_TONE, visibilityLabel } from "../../utils/status";

export function TeamDetailScreen({ route, navigation }: RootScreenProps<"TeamDetail">) {
  const { teamId } = route.params;
  const { user, isAdmin } = useAuth();
  const { c } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: team, error, loading, refreshing, refresh, reload } = useQuery(`team:${teamId}`, () => teamsApi.get(teamId));

  useEffect(() => {
    if (team) navigation.setOptions({ title: team.name });
  }, [navigation, team]);

  if (loading) return <LoadingView />;
  if (error || !team) return <ErrorState error={error} onRetry={refresh} />;

  const isCaptain = user?.id === team.captainId;

  const removePlayer = async (playerId: number, name: string) => {
    const ok = await confirm({ title: `${name} silinsin?`, confirmLabel: "Sil", destructive: true });
    if (!ok) return;
    try {
      await teamsApi.removePlayer(teamId, playerId);
      toast.success("Oyunçu silindi");
      invalidateQueries("teams:");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const openCompetition = (kind: "league" | "championship", id: number) => {
    if (kind === "league") {
      navigation.navigate(isAdmin ? "AdminLeagueDetail" : "LeagueDetail", { leagueId: id });
    } else if (isAdmin) {
      navigation.navigate("AdminChampionship", { championshipId: id });
    } else {
      navigation.navigate("ChampionshipDetail", { championshipId: id });
    }
  };

  return (
    <ScrollScreen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <TeamCrest name={team.name} logo={team.logo} size={80} />
        <Title size={34} style={{ textAlign: "center" }}>
          {team.name}
        </Title>
        <View style={styles.metaRow}>
          {team.city ? <Meta icon="location-outline" text={team.city} /> : null}
          <Meta icon="people-outline" text={`${team.players.length} oyunçu`} />
          {team.captain ? (
            <Text style={styles.metaText}>
              Kapitan: <Text style={styles.captain}>@{team.captain.username}</Text>
            </Text>
          ) : null}
        </View>
        {team.description ? <Text style={styles.desc}>{team.description}</Text> : null}
      </View>

      <Row style={{ marginTop: spacing.lg }}>
        <Stat label="Oyun" value={team.leagueStats.matchesPlayed} />
        <Stat label="Qol" value={team.leagueStats.goals} accent />
        <Stat label="Asist" value={team.leagueStats.assists} />
      </Row>
      <Muted style={{ marginTop: spacing.sm, textAlign: "center", fontSize: 12 }}>Bütün liqalar və çempionatlar üzrə statistika</Muted>

      {team.leagueMemberships.length > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.chipsLabel}>LİQALAR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
            {team.leagueMemberships.map(({ league }) => (
              <Pressable key={league.id} onPress={() => openCompetition("league", league.id)} accessibilityRole="button" accessibilityLabel={league.name} style={styles.chip}>
                <Ionicons name="trophy-outline" size={13} color={c.textMuted} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {league.name}
                </Text>
                <Pill label={visibilityLabel(league.visibility)} tone={league.visibility === "PUBLIC" ? "blue" : "violet"} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {team.championshipTeams.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={styles.chipsLabel}>ÇEMPİONATLAR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
            {team.championshipTeams.map(({ championship }) => {
              const phase = championshipPhase(championship.status);
              return (
                <Pressable
                  key={championship.id}
                  onPress={() => openCompetition("championship", championship.id)}
                  accessibilityRole="button"
                  accessibilityLabel={championship.name}
                  style={styles.chip}
                >
                  <Ionicons name="medal-outline" size={13} color={c.textMuted} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {championship.name}
                  </Text>
                  <Pill label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {isCaptain ? (
        <View style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>Oyunçuya komanda dəvəti göndər</Text>
          <Muted>İstifadəçi adı ilə oyunçu tapın və komandaya dəvət edin.</Muted>
          <Button title="Dəvət göndər" icon="send" size="sm" onPress={() => setInviteOpen(true)} fullWidth />
        </View>
      ) : null}

      <SectionTitle count={team.players.length}>Heyət</SectionTitle>
      <View style={styles.roster}>
        {team.players.map((p, index) => {
          const name = `${p.firstName} ${p.lastName}`.trim();
          const captain = p.userId === team.captainId;
          return (
            <View key={p.id} style={[styles.player, index > 0 && styles.playerBorder]}>
              <Pressable
                style={styles.playerMain}
                onPress={() => navigation.navigate("PlayerProfile", { playerId: p.id })}
                accessibilityRole="button"
                accessibilityLabel={`${name} profili`}
              >
                <Avatar uri={p.photo ?? p.user?.image} name={name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.playerSub}>{p.user?.username ? `@${p.user.username}` : "—"}</Text>
                </View>
                {captain ? <Pill label="Kapitan" tone="lime" /> : null}
              </Pressable>
              {isCaptain && !captain ? (
                <Pressable
                  onPress={() => void removePlayer(p.id, name)}
                  accessibilityRole="button"
                  accessibilityLabel={`${name} oyunçusunu sil`}
                  hitSlop={10}
                  style={styles.remove}
                >
                  <Ionicons name="trash-outline" size={18} color={c.red} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      <InvitePlayerSheet visible={inviteOpen} teamId={teamId} onClose={() => setInviteOpen(false)} />
    </ScrollScreen>
  );
}

/** Captain invites a user by username; suggestions come from GET /api/users/search. */
function InvitePlayerSheet({ visible, teamId, onClose }: { visible: boolean; teamId: number; onClose: () => void }) {
  const toast = useToast();
  const { c } = useTheme();
  const styles = useStyles();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [hits, setHits] = useState<UserSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(username, 350);

  useEffect(() => {
    if (!visible) return;
    setUsername("");
    setMessage("");
    setHits([]);
    setError(null);
  }, [visible]);

  useEffect(() => {
    const q = debounced.trim();
    if (!visible || q.length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    usersApi
      .search(q, controller.signal)
      .then(setHits)
      .catch(() => setHits([]));
    return () => controller.abort();
  }, [debounced, visible]);

  const submit = async () => {
    const value = username.trim().replace(/^@/, "").toLowerCase();
    if (!value) {
      setError("İstifadəçi adını yazın");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await teamsApi.invitePlayer(teamId, { username: value, message: message.trim() || undefined });
      toast.success("Oyunçuya komanda dəvəti göndərildi");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Dəvət göndərilmədi"));
    } finally {
      setBusy(false);
    }
  };

  const exact = hits.some((h) => h.username === username.trim().toLowerCase());

  return (
    <BottomSheet
      visible={visible}
      title="Oyunçuya komanda dəvəti"
      onClose={onClose}
      busy={busy}
      footer={<Button title="Dəvət göndər" icon="send" loading={busy} onPress={() => void submit()} style={{ flex: 1 }} />}
    >
      <TextField
        label="İstifadəçi adı"
        icon="at"
        value={username}
        onChangeText={setUsername}
        placeholder="username"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!exact && hits.length > 0 ? (
        <View style={styles.hits}>
          {hits.slice(0, 5).map((hit, i) => (
            <Pressable
              key={hit.id}
              style={[styles.hit, i > 0 && styles.playerBorder]}
              onPress={() => setUsername(hit.username)}
              accessibilityRole="button"
              accessibilityLabel={`${fullName(hit)} seç`}
            >
              <Avatar uri={hit.image} name={fullName(hit)} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{fullName(hit)}</Text>
                <Text style={styles.playerSub}>
                  @{hit.username}
                  {hit.teamName ? ` · ${hit.teamName}` : ""}
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={20} color={c.brandInk} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextField label="Dəvət mesajı" value={message} onChangeText={setMessage} placeholder="Komandamıza qoşulmaq istəyirsən?" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) => ({
  header: { alignItems: "center", gap: 10, paddingTop: spacing.sm },
  metaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, rowGap: 6 },
  metaText: { fontSize: 12.5, fontFamily: ff.regular, color: c.textMuted },
  captain: { fontFamily: ff.bold, color: c.brandInk },
  desc: { fontSize: font.sm, fontFamily: ff.regular, color: c.text, textAlign: "center", lineHeight: 19 },
  chipsLabel: { fontFamily: ff.bold, fontSize: 11, letterSpacing: 1.2, color: c.textFaint, marginBottom: 8 },
  chipsScroll: { marginHorizontal: -spacing.lg },
  chips: { gap: 8, paddingHorizontal: spacing.lg },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 36,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.borderStrong,
    maxWidth: 280,
  },
  chipText: { fontFamily: ff.semibold, fontSize: 12.5, color: c.ink, flexShrink: 1 },
  inviteCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  inviteTitle: { fontFamily: ff.bold, fontSize: 14, color: c.ink },
  roster: {
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14,
    ...cardShadow(c),
  },
  player: { flexDirection: "row", alignItems: "center", minHeight: 62 },
  playerBorder: { borderTopWidth: 1, borderTopColor: c.border },
  playerMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  playerName: { fontSize: 14, fontFamily: ff.bold, color: c.ink, flexShrink: 1 },
  playerSub: { fontSize: 12, fontFamily: ff.regular, color: c.textFaint, marginTop: 1 },
  remove: { width: 40, height: 44, alignItems: "flex-end", justifyContent: "center" },
  hits: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, marginBottom: spacing.md, overflow: "hidden", paddingHorizontal: 10 },
  hit: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8, minHeight: 50 },
  error: { color: c.red, fontFamily: ff.semibold },
}));
