import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../../api/errors";
import { challengesApi, playerSearchApi } from "../../api/social";
import { ChipBar } from "../../components/ChipBar";
import { Screen, useRefreshTint } from "../../components/Screen";
import { EmptyState, ErrorState, SkeletonList } from "../../components/states";
import { Button, Card, Muted, Pill, Row, SectionTitle, TeamCrest } from "../../components/ui";
import { useCurrentUser } from "../../context/AuthContext";
import { useSocketEvent } from "../../context/RealtimeContext";
import { useToast } from "../../context/ToastContext";
import { MY_TEAMS_KEY, useMyTeams } from "../../hooks/useMyTeams";
import { invalidateQueries, useQuery } from "../../hooks/useQuery";
import type { FootballSection, RootScreenProps } from "../../navigation/types";
import { ff, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { Challenge, PlayerSearch } from "../../types/social";
import type { TeamSummary } from "../../types/team";
import { CompetitionsPanel } from "./CompetitionsPanel";
import { CreateChallengeSheet, CreatePlayerSearchSheet, CreateTeamSheet } from "./CreateSheets";
import { ChallengeCard, PlayerSearchCard } from "./SocialCards";

const TABS: { key: FootballSection; label: string }[] = [
  { key: "teams", label: "Komanda profilim" },
  { key: "players", label: "Oyunçu axtarışı" },
  { key: "challenges", label: "Oyun təklifləri" },
  { key: "leagues", label: "Liqalar" },
  { key: "championships", label: "Çempionatlar" },
];

type Section<T> = { title: string; empty: string; items: T[] };

/** Web /sports/football: team, player search, match offers, leagues and championships. */
export function FootballScreen({ route }: RootScreenProps<"Football">) {
  const navigation = useNavigation();
  const user = useCurrentUser();
  const toast = useToast();
  const refreshTint = useRefreshTint();
  const styles = useStyles();
  const [tab, setTab] = useState<FootballSection>(route.params?.section ?? "teams");
  // Home quick links open a specific section.
  useEffect(() => {
    if (route.params?.section) setTab(route.params.section);
  }, [route.params]);
  const [sheet, setSheet] = useState<"team" | "challenge" | "search" | null>(null);
  const [busy, setBusy] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [pickedTeams, setPickedTeams] = useState<Record<number, number>>({});

  const teams = useMyTeams();
  const challenges = useQuery(tab === "challenges" ? "challenges" : null, () => challengesApi.list());
  const searches = useQuery(tab === "players" ? "player-searches" : null, () => playerSearchApi.list());

  // Captains/requesters get this when a request on their listing changes.
  useSocketEvent("social_requests_changed", () => {
    void challenges.reload();
    void searches.reload();
  });

  const openTeam = useCallback((teamId: number) => navigation.navigate("TeamDetail", { teamId }), [navigation]);

  const run = useCallback(
    async (action: () => Promise<unknown>, success: string, reload: () => Promise<void>) => {
      setBusy(true);
      try {
        await action();
        toast.success(success);
        await reload();
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const respond = useCallback(
    async (kind: "challenge" | "search", requestId: number, action: "accept" | "reject") => {
      setRespondingId(requestId);
      try {
        if (kind === "challenge") await challengesApi.respond(requestId, action);
        else await playerSearchApi.respond(requestId, action);
        toast.success(action === "accept" ? "Sorğu qəbul edildi" : "Sorğu rədd edildi");
        await (kind === "challenge" ? challenges.reload() : searches.reload());
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setRespondingId(null);
      }
    },
    [challenges, searches, toast],
  );

  const challengeSections = useMemo<Section<Challenge>[]>(() => {
    const all = challenges.data ?? [];
    const mine = all.filter((c) => c.createdById === user.id || c.team.captainId === user.id);
    const others = all.filter((c) => !mine.includes(c));
    return [
      { title: "Sənin oyun təklifləri", empty: "Hələ oyun təklifiniz yoxdur", items: mine },
      { title: "Digər oyun təklifləri", empty: "Açıq oyun təklifi yoxdur", items: others },
    ];
  }, [challenges.data, user.id]);

  const searchSections = useMemo<Section<PlayerSearch>[]>(() => {
    const all = searches.data ?? [];
    const mine = all.filter((s) => s.createdById === user.id || s.hostTeam.captainId === user.id);
    const others = all.filter((s) => !mine.includes(s));
    return [
      { title: "Sənin axtarışların", empty: "Hələ axtarışınız yoxdur", items: mine },
      { title: "Digər axtarışlar", empty: "Açıq oyunçu axtarışı yoxdur", items: others },
    ];
  }, [searches.data, user.id]);

  let body: React.ReactNode;
  if (tab === "leagues" || tab === "championships") {
    body = <CompetitionsPanel key={tab} tab={tab} />;
  } else if (tab === "teams") {
    body = (
      <FlatList
        data={teams.teams}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={teams.refreshing} onRefresh={teams.refresh} {...refreshTint} />}
        ListHeaderComponent={
          <View style={styles.top}>
            <Button title="Komanda yarat" icon="add" onPress={() => setSheet("team")} fullWidth />
            <Muted>Kapitan olduğunuz və ya oynadığınız komandalar</Muted>
          </View>
        }
        ListEmptyComponent={
          teams.loading ? (
            <SkeletonList rows={3} />
          ) : teams.error ? (
            <ErrorState error={teams.error} onRetry={teams.refresh} />
          ) : (
            <EmptyState icon="shirt-outline" title="Hələ komandanız yoxdur" description="Komanda yaradın və ya kapitanın dəvətini qəbul edin." />
          )
        }
        renderItem={({ item }) => <TeamRow team={item} isCaptain={item.captainId === user.id} onPress={() => openTeam(item.id)} />}
        ItemSeparatorComponent={Separator}
      />
    );
  } else {
    const isChallenges = tab === "challenges";
    const query = isChallenges ? challenges : searches;
    const sections = isChallenges ? challengeSections : searchSections;
    type ListRow = { kind: "title"; title: string; count: number } | { kind: "empty"; text: string } | { kind: "item"; item: Challenge | PlayerSearch };
    const rows: ListRow[] = [];
    for (const section of sections as Section<Challenge | PlayerSearch>[]) {
      rows.push({ kind: "title", title: section.title, count: section.items.length });
      if (section.items.length === 0) rows.push({ kind: "empty", text: section.empty });
      section.items.forEach((item) => rows.push({ kind: "item", item }));
    }
    body = (
      <FlatList
        data={query.loading || query.error ? [] : rows}
        keyExtractor={(row, i) => (row.kind === "item" ? `i-${row.item.id}` : `${row.kind}-${i}`)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} {...refreshTint} />}
        ListHeaderComponent={
          <View style={styles.top}>
            {teams.isCaptain ? (
              <Button
                title={isChallenges ? "Oyun təklifi yarat" : "Axtarış yarat"}
                icon={isChallenges ? "flash" : "add"}
                onPress={() => setSheet(isChallenges ? "challenge" : "search")}
                fullWidth
              />
            ) : null}
            <Muted>
              {teams.isCaptain
                ? isChallenges
                  ? "Rəqib axtaran komandalar"
                  : "Çatışmayan oyunçu üçün açıq axtarışlar"
                : isChallenges
                  ? "Oyun təklifi yaratmaq üçün komanda kapitanı olmalısınız"
                  : "Axtarış yaratmaq üçün komanda kapitanı olmalısınız"}
            </Muted>
          </View>
        }
        ListEmptyComponent={
          query.loading ? <SkeletonList rows={3} /> : query.error ? <ErrorState error={query.error} onRetry={query.refresh} /> : null
        }
        renderItem={({ item: row }) => {
          if (row.kind === "title") return <SectionTitle count={row.count}>{row.title}</SectionTitle>;
          if (row.kind === "empty") return <Muted style={styles.empty}>{row.text}</Muted>;
          if (isChallenges) {
            const c = row.item as Challenge;
            return (
              <ChallengeCard
                challenge={c}
                userId={user.id}
                captainTeams={teams.captainTeams}
                pickedTeamId={pickedTeams[c.id] ?? null}
                busy={busy}
                respondingId={respondingId}
                onOpenTeam={openTeam}
                onPickTeam={(challengeId, teamId) => setPickedTeams((p) => ({ ...p, [challengeId]: teamId }))}
                onRequest={(challengeId, teamId) =>
                  void run(() => challengesApi.request(challengeId, teamId), "Sorğu göndərildi", challenges.reload)
                }
                onCancelRequest={(id) => void run(() => challengesApi.cancelRequest(id), "Sorğu ləğv edildi", challenges.reload)}
                onRespond={(id, action) => void respond("challenge", id, action)}
              />
            );
          }
          return (
            <PlayerSearchCard
              search={row.item as PlayerSearch}
              userId={user.id}
              busy={busy}
              respondingId={respondingId}
              onOpenTeam={openTeam}
              onJoin={(id) => void run(() => playerSearchApi.join(id), "Sorğu göndərildi", searches.reload)}
              onCancelRequest={(id) => void run(() => playerSearchApi.cancelRequest(id), "Sorğu ləğv edildi", searches.reload)}
              onRespond={(id, action) => void respond("search", id, action)}
            />
          );
        }}
        ItemSeparatorComponent={Separator}
      />
    );
  }

  return (
    <Screen>
      <ChipBar items={TABS} active={tab} onChange={setTab} />
      {body}
      <CreateTeamSheet
        visible={sheet === "team"}
        onClose={() => setSheet(null)}
        onDone={() => {
          setSheet(null);
          invalidateQueries(MY_TEAMS_KEY);
          void teams.reload();
        }}
      />
      <CreateChallengeSheet
        visible={sheet === "challenge"}
        captainTeams={teams.captainTeams}
        onClose={() => setSheet(null)}
        onDone={() => {
          setSheet(null);
          void challenges.reload();
        }}
      />
      <CreatePlayerSearchSheet
        visible={sheet === "search"}
        captainTeams={teams.captainTeams}
        onClose={() => setSheet(null)}
        onDone={() => {
          setSheet(null);
          void searches.reload();
        }}
      />
    </Screen>
  );
}

function Separator() {
  return <View style={{ height: spacing.md }} />;
}

function TeamRow({ team, isCaptain, onPress }: { team: TeamSummary; isCaptain: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  const leagues = team.leagueMemberships?.length ?? 0;
  return (
    <Card onPress={onPress} accessibilityLabel={`${team.name} komandası`} highlight={isCaptain}>
      <Row gap={spacing.md}>
        <TeamCrest name={team.name} logo={team.logo} size={46} />
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={6}>
            <Text style={styles.teamName} numberOfLines={1}>
              {team.name}
            </Text>
            {isCaptain ? <Pill label="Kapitan" tone="lime" /> : <Pill label="Üzv" />}
          </Row>
          <Text style={styles.meta}>
            {[team.city, `${team._count?.players ?? 0} oyunçu`, leagues ? `${leagues} liqa` : null].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
      </Row>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  top: { marginBottom: spacing.md, gap: spacing.md },
  empty: { paddingVertical: spacing.sm },
  teamName: { flexShrink: 1, fontSize: 15.5, fontFamily: ff.bold, color: c.ink },
  meta: { fontSize: 12.5, fontFamily: ff.regular, color: c.textMuted },
}));
