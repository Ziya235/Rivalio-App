import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { championshipsApi } from "../../api/championships";
import { errorMessage } from "../../api/errors";
import { leaguesApi } from "../../api/leagues";
import { teamsApi } from "../../api/teams";
import { BottomSheet } from "../../components/BottomSheet";
import { SelectField } from "../../components/fields";
import { useRefreshTint } from "../../components/Screen";
import { EmptyState, ErrorState, SkeletonList } from "../../components/states";
import { Button, Card, IconTile, Muted, Pill, Row, StatusPill, TeamCrest } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { useMyTeams } from "../../hooks/useMyTeams";
import { useQuery } from "../../hooks/useQuery";
import { ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { RequestStatus, Visibility } from "../../types/common";
import type { TeamSummary } from "../../types/team";
import {
  championshipPhase,
  leaguePhase,
  PHASE_LABEL,
  PHASE_TONE,
  visibilityLabel,
  type CompetitionPhase,
} from "../../utils/status";

export type CompetitionKind = "leagues" | "championships";

/** League and championship rows share this normalized shape for the list. */
type Item = {
  id: number;
  name: string;
  logo: string | null;
  description: string | null;
  visibility: Visibility;
  phase: CompetitionPhase;
  /** Join requests are only accepted while the competition is still being planned (DRAFT). */
  isDraft: boolean;
  teamCount: number;
  season?: string | null;
  canView: boolean;
  myJoinRequests: Array<{ id: number; teamId: number; status: RequestStatus }>;
  joinedTeamIds: Set<number>;
};

const VISIBILITY_FILTERS: Array<{ label: string; value: "" | Visibility }> = [
  { label: "Hamısı", value: "" },
  { label: "İctimai", value: "PUBLIC" },
  { label: "Özəl", value: "PRIVATE" },
];
const PHASE_FILTERS: Array<{ label: string; value: "" | CompetitionPhase }> = [
  { label: "Hamısı", value: "" },
  { label: PHASE_LABEL.PLANNED, value: "PLANNED" },
  { label: PHASE_LABEL.ONGOING, value: "ONGOING" },
  { label: PHASE_LABEL.FINISHED, value: "FINISHED" },
];

/** "Liqalar" / "Çempionatlar" tabs of the football hub, with join requests for captains. */
export function CompetitionsPanel({ tab }: { tab: CompetitionKind }) {
  const navigation = useNavigation();
  const toast = useToast();
  const { c } = useTheme();
  const styles = useStyles();
  const refreshTint = useRefreshTint();
  const [visibility, setVisibility] = useState<"" | Visibility>("");
  const [phase, setPhase] = useState<"" | CompetitionPhase>("");
  const [pick, setPick] = useState<{ item: Item; teams: TeamSummary[] } | null>(null);
  const [pickedTeamId, setPickedTeamId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const myTeams = useMyTeams();
  const leagues = useQuery(tab === "leagues" ? "leagues:all" : null, () => leaguesApi.list({ includeAll: true }));
  const championships = useQuery(tab === "championships" ? "championships:all" : null, () =>
    championshipsApi.list({ includeAll: true }),
  );
  const query = tab === "leagues" ? leagues : championships;

  const items = useMemo<Item[]>(() => {
    if (tab === "leagues") {
      return (leagues.data ?? [])
        .filter((l) => !l.sport || l.sport.code === "FOOTBALL")
        .map((l) => ({
          id: l.id,
          name: l.name,
          logo: l.logo,
          description: l.description,
          visibility: l.visibility,
          phase: leaguePhase(l.status),
          isDraft: l.status === "DRAFT",
          teamCount: l._count?.teams ?? 0,
          season: l.season,
          canView: l.canView !== false,
          myJoinRequests: l.myJoinRequests ?? [],
          joinedTeamIds: new Set(
            myTeams.teams.filter((t) => t.leagueMemberships?.some((m) => m.league.id === l.id)).map((t) => t.id),
          ),
        }));
    }
    return (championships.data ?? []).map((ch) => ({
      id: ch.id,
      name: ch.name,
      logo: ch.logo,
      description: ch.description,
      visibility: ch.visibility ?? "PRIVATE",
      phase: championshipPhase(ch.status),
      isDraft: ch.status === "DRAFT",
      teamCount: ch.teamCount,
      canView: ch.canView !== false,
      myJoinRequests: ch.myJoinRequests ?? [],
      joinedTeamIds: new Set([...(ch.teams ?? []).map((t) => t.teamId), ...(ch.myTeams ?? []).map((t) => t.id)]),
    }));
  }, [tab, leagues.data, championships.data, myTeams.teams]);

  const filtered = useMemo(
    () => items.filter((item) => (!visibility || item.visibility === visibility) && (!phase || item.phase === phase)),
    [items, visibility, phase],
  );

  const reload = useCallback(async () => {
    await Promise.all([query.reload(), myTeams.reload()]);
  }, [query, myTeams]);

  const sendJoin = async (item: Item, teamId: number) => {
    setBusyId(item.id);
    try {
      if (tab === "leagues") await teamsApi.requestJoinLeague(item.id, teamId);
      else await championshipsApi.requestJoin(item.id, teamId);
      toast.success("Qoşulma sorğusu göndərildi");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const cancelJoin = async (item: Item, requestId: number) => {
    setBusyId(item.id);
    try {
      if (tab === "leagues") await teamsApi.cancelLeagueJoinRequest(requestId);
      else await championshipsApi.cancelJoinRequest(requestId);
      toast.success("Sorğu ləğv edildi");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const open = (item: Item) => {
    if (!item.canView) {
      toast.info(
        tab === "leagues" ? "Bu özəl liqaya yalnız iştirakçılar baxa bilər" : "Bu özəl çempionata yalnız iştirakçılar baxa bilər",
      );
      return;
    }
    if (tab === "leagues") navigation.navigate("LeagueDetail", { leagueId: item.id });
    else navigation.navigate("ChampionshipDetail", { championshipId: item.id });
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={query.loading || query.error ? [] : filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} {...refreshTint} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -spacing.lg }}>
              <View style={{ width: spacing.lg - 8 }} />
              {PHASE_FILTERS.map((o) => (
                <FilterChip key={o.value || "all"} label={o.label} active={o.value === phase} onPress={() => setPhase(o.value)} />
              ))}
              <View style={{ width: spacing.lg - 8 }} />
            </ScrollView>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {VISIBILITY_FILTERS.map((o) => {
                const active = o.value === visibility;
                return (
                  <Pressable
                    key={o.value || "all"}
                    onPress={() => setVisibility(o.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[styles.segItem, active && styles.segItemActive]}
                  >
                    {o.value ? (
                      <Ionicons name={o.value === "PUBLIC" ? "globe-outline" : "lock-closed-outline"} size={13} color={active ? c.onInverse : c.textMuted} />
                    ) : null}
                    <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Muted>
              {myTeams.isCaptain
                ? `${tab === "leagues" ? "Liqada" : "Çempionatda"} iştirak etmək üçün planlaşdırılan yarışlara sorğu göndərin. Özəl yarışlara yalnız iştirakçılar baxa bilər.`
                : `${tab === "leagues" ? "Liqaya" : "Çempionata"} sorğu göndərmək üçün komanda kapitanı olmalısınız.`}
            </Muted>
          </View>
        }
        ListEmptyComponent={
          query.loading ? (
            <SkeletonList />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={query.refresh} />
          ) : (
            <EmptyState
              icon="trophy-outline"
              title={items.length === 0 ? (tab === "leagues" ? "Liqa yoxdur" : "Çempionat yoxdur") : "Filtrə uyğun nəticə yoxdur"}
            />
          )
        }
        renderItem={({ item }) => {
          const rows = myTeams.captainTeams.map((team) => ({
            team,
            joined: item.joinedTeamIds.has(team.id),
            pending: item.myJoinRequests.find((r) => r.teamId === team.id && r.status === "PENDING"),
          }));
          const available = rows.filter((r) => !r.joined && !r.pending).map((r) => r.team);
          const pendingRows = rows.filter((r) => r.pending);
          const anyJoined = rows.some((r) => r.joined);
          const canRequest = myTeams.isCaptain && item.isDraft && !anyJoined && pendingRows.length === 0 && available.length > 0;
          return (
            <Card onPress={() => open(item)} accessibilityLabel={item.name}>
              <Row gap={spacing.md} style={{ alignItems: "flex-start" }}>
                {item.logo ? (
                  <TeamCrest name={item.name} logo={item.logo} size={42} />
                ) : (
                  <IconTile icon={tab === "leagues" ? "trophy-outline" : "medal-outline"} tone={item.phase === "ONGOING" ? "lime" : item.phase === "PLANNED" ? "orange" : "violet"} size={42} />
                )}
                <View style={{ flex: 1, gap: 6 }}>
                  <Row gap={6}>
                    <Text style={[styles.name, !item.canView && { color: c.textMuted }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {!item.canView ? <Ionicons name="lock-closed" size={13} color={c.textMuted} /> : null}
                  </Row>
                  <Row gap={6} style={{ flexWrap: "wrap" }}>
                    <Pill label={PHASE_LABEL[item.phase]} tone={PHASE_TONE[item.phase]} />
                    <Pill label={visibilityLabel(item.visibility)} tone={item.visibility === "PUBLIC" ? "blue" : "violet"} />
                  </Row>
                  <Text style={styles.meta}>
                    {item.teamCount} komanda{item.season ? ` · ${item.season}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={c.textFaint} />
              </Row>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              {anyJoined ? (
                <View style={styles.actions}>
                  <StatusPill tone="accepted" label="Qoşulub" />
                </View>
              ) : canRequest || pendingRows.length > 0 ? (
                <Row style={[styles.actions, { flexWrap: "wrap" }]}>
                  {pendingRows.length > 0 ? <StatusPill tone="pending" label="Gözləyir" /> : null}
                  {canRequest ? (
                    <Button
                      title="Qoşulma sorğusu"
                      icon="send"
                      size="sm"
                      loading={busyId === item.id}
                      onPress={() => {
                        if (available.length === 1) void sendJoin(item, available[0].id);
                        else {
                          setPickedTeamId(available[0]?.id ?? null);
                          setPick({ item, teams: available });
                        }
                      }}
                    />
                  ) : null}
                  {pendingRows.map((row) => (
                    <Button
                      key={row.pending!.id}
                      title={pendingRows.length > 1 ? `Ləğv et · ${row.team.name}` : "Ləğv et"}
                      size="sm"
                      variant="danger"
                      disabled={busyId === item.id}
                      onPress={() => void cancelJoin(item, row.pending!.id)}
                    />
                  ))}
                </Row>
              ) : null}
            </Card>
          );
        }}
      />
      <BottomSheet
        visible={pick != null}
        title="Komanda seçin"
        onClose={() => setPick(null)}
        footer={
          <Button
            title="Sorğu göndər"
            icon="send"
            style={{ flex: 1 }}
            disabled={!pickedTeamId}
            onPress={() => {
              if (!pick || !pickedTeamId) return;
              const target = pick.item;
              setPick(null);
              void sendJoin(target, pickedTeamId);
            }}
          />
        }
      >
        {pick ? <Muted style={{ marginBottom: spacing.md }}>{pick.item.name}</Muted> : null}
        <SelectField
          label="Komanda"
          value={pickedTeamId}
          options={(pick?.teams ?? []).map((t) => ({ label: t.name, value: t.id }))}
          onChange={setPickedTeamId}
        />
      </BottomSheet>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
      hitSlop={4}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.borderStrong,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: c.brand, borderColor: c.brand },
  chipText: { fontSize: 12.5, fontFamily: ff.semibold, color: c.textMuted },
  chipTextActive: { color: c.onBrand },
  segment: { flexDirection: "row", backgroundColor: c.cardMuted, borderRadius: radius.md, padding: 3, gap: 3 },
  segItem: { flex: 1, flexDirection: "row", gap: 5, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  segItemActive: { backgroundColor: c.inverse },
  segText: { fontSize: 12.5, fontFamily: ff.semibold, color: c.textMuted },
  segTextActive: { color: c.onInverse },
  name: { flexShrink: 1, fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  meta: { fontSize: 12, fontFamily: ff.regular, color: c.textMuted },
  desc: { marginTop: spacing.sm, fontSize: font.sm, fontFamily: ff.regular, color: c.textMuted, lineHeight: 19 },
  actions: { marginTop: spacing.md, gap: spacing.sm },
}));
