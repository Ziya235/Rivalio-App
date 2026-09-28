import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { adminChampionshipsApi } from "../../api/championships";
import { ApiError, errorMessage } from "../../api/errors";
import { adminMatchesApi } from "../../api/matches";
import { ChipBar } from "../../components/ChipBar";
import { confirm } from "../../components/fields";
import { ScrollScreen } from "../../components/Screen";
import { ErrorState, LoadingView } from "../../components/states";
import { Button, Card, IconButton, InfoBox, Muted, Row, SectionTitle, TeamCrest } from "../../components/ui";
import { useSocketEvent } from "../../context/RealtimeContext";
import { useToast } from "../../context/ToastContext";
import { useNow, usePolling } from "../../hooks/timers";
import { useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { cardShadow, ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { Championship, ChampionshipGroup, PlayoffTieGroup } from "../../types/championship";
import type { Match } from "../../types/match";
import { isGroupStageComplete } from "../../utils/rounds";
import { championshipPhase, isSetupStatus } from "../../utils/status";
import {
  AllMatchesView,
  ChampionshipHeaderCard,
  championshipTabs,
  GroupsView,
  OverviewView,
  PlayoffView,
  StatsView,
  type ChampTab,
} from "../championship/ChampionshipViews";
import { AdminMatchRow } from "./AdminMatchRow";
import {
  AddToGroupSheet,
  CreateGroupsSheet,
  EditGroupSheet,
  GROUP_CHAMP_TEAM_MAX,
  GROUP_CHAMP_TEAM_MIN,
  TieBreakSheet,
} from "./ChampionshipSetupSections";
import { ScheduleSheet } from "./ScheduleSheet";
import { TeamPickerSheet } from "./TeamPickerSheet";

export function AdminChampionshipScreen({ route, navigation }: RootScreenProps<"AdminChampionship">) {
  const { championshipId: id } = route.params;
  const toast = useToast();
  const champ = useQuery(`admin:champ:${id}`, () => adminChampionshipsApi.get(id));
  const joins = useQuery(`admin:champ:${id}:joins`, () => adminChampionshipsApi.joinRequests(id).catch(() => []));
  const [busy, setBusy] = useState(false);
  const [ties, setTies] = useState<{ groups: PlayoffTieGroup[]; playoffOnly: boolean } | null>(null);

  useSocketEvent("notification_received", ({ notification }) => {
    if (notification.type === "CHAMPIONSHIP_JOIN_REQUEST" || notification.type === "CHAMPIONSHIP_INVITE") {
      void champ.reload();
      void joins.reload();
    }
  });

  useEffect(() => {
    if (champ.data) navigation.setOptions({ title: champ.data.name });
  }, [navigation, champ.data]);

  const startPlayoff = useCallback(
    async (playoffOnly: boolean, tieBreakTeamIds?: number[]) => {
      setBusy(true);
      try {
        await adminChampionshipsApi.startPlayoff(id, { playoffOnly, tieBreakTeamIds });
        setTies(null);
        toast.success("Pley-off başladı");
        await champ.reload();
      } catch (err) {
        if (err instanceof ApiError && err.code === "PLAYOFF_TIE" && err.ties?.length) {
          setTies({ groups: err.ties, playoffOnly });
          toast.info(err.message);
        } else {
          toast.error(errorMessage(err, "Əməliyyat uğursuz oldu"));
        }
      } finally {
        setBusy(false);
      }
    },
    [champ, id, toast],
  );

  if (champ.loading) return <LoadingView />;
  if (champ.error || !champ.data) return <ErrorState error={champ.error} onRetry={champ.refresh} />;

  const c = champ.data;
  const common = { championship: c, busy, setBusy, reload: champ.reload, startPlayoff };
  return (
    <>
      {isSetupStatus(c.status) ? (
        <SetupView {...common} joins={joins.data ?? []} reloadJoins={joins.reload} refreshing={champ.refreshing} refresh={champ.refresh} />
      ) : (
        <ManageView {...common} />
      )}
      <TieBreakSheet
        groups={ties?.groups ?? null}
        busy={busy}
        onClose={() => setTies(null)}
        onSubmit={(ids) => void startPlayoff(ties?.playoffOnly ?? false, ids)}
      />
    </>
  );
}

type CommonProps = {
  championship: Championship;
  busy: boolean;
  setBusy: (b: boolean) => void;
  reload: () => Promise<void>;
  startPlayoff: (playoffOnly: boolean, tieBreakTeamIds?: number[]) => Promise<void>;
};

function SetupView({
  championship: c,
  busy,
  setBusy,
  reload,
  startPlayoff,
  joins,
  reloadJoins,
  refreshing,
  refresh,
}: CommonProps & {
  joins: Awaited<ReturnType<typeof adminChampionshipsApi.joinRequests>>;
  reloadJoins: () => Promise<void>;
  refreshing: boolean;
  refresh: () => Promise<void>;
}) {
  const toast = useToast();
  const theme = useTheme();
  const styles = useStyles();
  const [addOpen, setAddOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ChampionshipGroup | null>(null);
  const [addToGroup, setAddToGroup] = useState<ChampionshipGroup | null>(null);

  const pendingInvites = c.pendingInvites ?? [];
  const pendingJoins = joins.filter((j) => j.status === "PENDING");
  const enrolled = new Set(c.teams.map((t) => t.teamId));
  const pendingIds = new Set([...pendingInvites.map((i) => i.teamId), ...pendingJoins.map((j) => j.teamId)]);
  const rosterCount = c.teams.length + pendingInvites.length + pendingJoins.length;
  const playoffOnly = c.format === "PLAYOFF_ONLY";
  const playoffReady = playoffOnly && c.maxTeams != null && c.teams.length === c.maxTeams;
  const inGroups = new Set(c.groups.flatMap((g) => g.teams.map((t) => t.teamId)));
  const unassigned = c.teams.filter((t) => !inGroups.has(t.teamId));
  const limit = playoffOnly ? c.maxTeams : GROUP_CHAMP_TEAM_MAX;

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await Promise.all([reload(), reloadJoins()]);
    } catch (err) {
      toast.error(errorMessage(err, "Əməliyyat uğursuz oldu"));
    } finally {
      setBusy(false);
    }
  };

  const startGroupStage = async () => {
    if (pendingInvites.length > 0) {
      toast.error("Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir.");
      return;
    }
    const ok = await confirm({
      title: "Çempionatı başlat",
      message: "Qrup mərhələsi başladıqdan sonra komanda əlavə etmək olmayacaq.",
      confirmLabel: "Başlat",
    });
    if (ok) await run(() => adminChampionshipsApi.startGroupStage(c.id), "Qrup mərhələsi başladı");
  };

  const startPlayoffOnly = async () => {
    if (pendingInvites.length > 0) {
      toast.error("Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir.");
      return;
    }
    const ok = await confirm({
      title: "Pley-off başlat",
      message: "Playoff mərhələsini başlatmaq istəyirsiniz? Komanda sayına uyğun cədvəl yaradılacaq.",
      confirmLabel: "Başlat",
    });
    if (ok) await startPlayoff(true);
  };

  return (
    <ScrollScreen refreshing={refreshing} onRefresh={() => void refresh()}>
      <ChampionshipHeaderCard championship={c} />
      <Row style={{ flexWrap: "wrap" }}>
        <Button
          title={c.visibility === "PUBLIC" ? "Özəl et" : "İctimai et"}
          icon={c.visibility === "PUBLIC" ? "lock-closed-outline" : "globe-outline"}
          size="sm"
          variant="soft"
          disabled={busy}
          onPress={() =>
            void run(() => adminChampionshipsApi.setVisibility(c.id, c.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"), "Görünürlük dəyişdi")
          }
        />
      </Row>

      {pendingJoins.length > 0 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Qoşulma sorğuları ({pendingJoins.length})</Text>
          <Text style={styles.panelSub}>Planlaşdırılan çempionata komanda kapitanlarından gələn sorğular</Text>
          {pendingJoins.map((r) => (
            <View key={r.id} style={styles.item}>
              <Row gap={spacing.md}>
                <TeamCrest name={r.team.name} logo={r.team.logo} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.team.name}</Text>
                  <Text style={styles.sub}>@{r.requestedBy?.username ?? "kapitan"}</Text>
                </View>
              </Row>
              <Row style={{ marginTop: 10 }}>
                <Button
                  title="Qəbul"
                  icon="checkmark"
                  size="sm"
                  disabled={busy}
                  onPress={() => void run(() => adminChampionshipsApi.respondJoinRequest(r.id, "accept"), "Sorğu qəbul edildi")}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Rədd"
                  icon="close"
                  size="sm"
                  variant="soft"
                  disabled={busy}
                  onPress={() => void run(() => adminChampionshipsApi.respondJoinRequest(r.id, "reject"), "Sorğu rədd edildi")}
                  style={{ flex: 1 }}
                />
              </Row>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.panel}>
        <Row gap={8}>
          <Ionicons name="people-outline" size={17} color={theme.c.brandInk} />
          <Text style={styles.panelTitle}>Komandalar</Text>
          <View style={styles.count}>
            <Text style={styles.countText}>
              {c.teams.length}
              {pendingInvites.length > 0 ? ` + ${pendingInvites.length} gözləmə` : ""}
              {limit != null ? ` / ${limit}` : ""}
            </Text>
          </View>
        </Row>
        <Button
          title="Dəvət et"
          icon="add"
          size="sm"
          onPress={() => setAddOpen(true)}
          disabled={busy || (limit != null && rosterCount >= limit)}
          fullWidth
          style={{ marginTop: 12 }}
        />
        <Text style={[styles.panelSub, { marginTop: 10 }]}>
          {playoffOnly
            ? `Yalnız playoff · ${c.maxTeams ?? "—"} komanda lazımdır (4 / 8 / 16). Sonra playoff başla.`
            : `${GROUP_CHAMP_TEAM_MIN}–${GROUP_CHAMP_TEAM_MAX} komanda. Komanda kapitanı dəvəti qəbul etdikdən sonra qrupa əlavə edə bilərsiniz. Başlatmaq üçün minimum ${GROUP_CHAMP_TEAM_MIN} qəbul olunmuş komanda lazımdır.`}
        </Text>
        <View style={{ gap: 6, marginTop: 10 }}>
          {c.teams.length === 0 && pendingInvites.length === 0 ? <Muted>Hələ komanda yoxdur. Sistemdən komanda dəvət edin.</Muted> : null}
          {pendingInvites.map((inv) => (
            <View key={`inv-${inv.id}`} style={[styles.chipRow, styles.chipRowPending]}>
              <TeamCrest name={inv.team.name} logo={inv.team.logo} size={24} />
              <View style={{ flex: 1 }}>
                <Text style={styles.chipName}>{inv.team.name}</Text>
                <Text style={[styles.sub, { color: theme.c.amber }]}>Kapitanın təsdiqi gözlənilir</Text>
              </View>
              <IconButton
                icon="close"
                color={theme.c.red}
                size={36}
                label={`${inv.team.name} dəvətini ləğv et`}
                onPress={async () => {
                  if (await confirm({ title: "Dəvəti ləğv et", message: "Dəvət ləğv olunacaq.", confirmLabel: "Ləğv et", destructive: true })) {
                    void run(() => adminChampionshipsApi.cancelInvite(c.id, inv.id), "Dəvət ləğv edildi");
                  }
                }}
              />
            </View>
          ))}
          {c.teams.map((t) => (
            <View key={t.id} style={styles.chipRow}>
              <TeamCrest name={t.team.name} logo={t.team.logo} size={24} />
              <Text style={[styles.chipName, { flex: 1 }]}>{t.team.name}</Text>
              <IconButton
                icon="close"
                color={theme.c.textMuted}
                size={36}
                label={`${t.team.name} komandasını çıxar`}
                onPress={async () => {
                  const ok = await confirm({
                    title: "Komandanı sil",
                    message: "Komanda çempionatdan çıxarılacaq, sistemdən silinməyəcək.",
                    confirmLabel: "Çıxar",
                    destructive: true,
                  });
                  if (ok) void run(() => adminChampionshipsApi.removeTeam(c.id, t.teamId), "Komanda çıxarıldı");
                }}
              />
            </View>
          ))}
        </View>
      </View>

      {!playoffOnly ? (
        <>
          <SectionTitle
            count={c.groups.length}
            right={
              c.groups.length === 0 ? (
                <Button title="Qrup yarat" icon="add" size="sm" variant="soft" disabled={c.teams.length < GROUP_CHAMP_TEAM_MIN} onPress={() => setGroupsOpen(true)} />
              ) : undefined
            }
          >
            Qruplar
          </SectionTitle>
          {c.groups.length === 0 ? (
            <Muted>
              {c.teams.length < GROUP_CHAMP_TEAM_MIN
                ? `Qrup yaratmaq üçün ən azı ${GROUP_CHAMP_TEAM_MIN} komanda lazımdır.`
                : "Qruplar hələ yaradılmayıb. “Qrup yarat” düyməsinə basın."}
            </Muted>
          ) : (
            <View style={{ gap: spacing.md }}>
              {[...c.groups]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((g) => {
                  const full = g.teamSlots != null && g.teams.length >= g.teamSlots;
                  const free = g.teamSlots != null ? Math.max(0, g.teamSlots - g.teams.length) : 0;
                  return (
                    <Card key={g.id} style={{ gap: 6 }}>
                      <Row style={{ marginBottom: 4 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name}>{g.name}</Text>
                          <Text style={styles.sub}>
                            {g.teams.length}
                            {g.teamSlots != null ? ` / ${g.teamSlots}` : ""} komanda
                          </Text>
                        </View>
                        <IconButton
                          icon="add"
                          bordered
                          size={38}
                          label={`${g.name} qrupuna komanda əlavə et`}
                          onPress={() => setAddToGroup(g)}
                          color={full ? theme.c.textFaint : theme.c.brandInk}
                        />
                        <IconButton icon="create-outline" bordered size={38} label={`${g.name} qrupunu redaktə et`} onPress={() => setEditGroup(g)} />
                        <IconButton
                          icon="trash-outline"
                          bordered
                          size={38}
                          color={theme.c.red}
                          label={`${g.name} qrupunu sil`}
                          onPress={async () => {
                            if (await confirm({ title: "Qrupu sil", message: `${g.name} silinsin?`, confirmLabel: "Sil", destructive: true })) {
                              void run(() => adminChampionshipsApi.deleteGroup(g.id), "Qrup silindi");
                            }
                          }}
                        />
                      </Row>
                      {g.teams.length === 0 ? <Muted>Komanda yoxdur</Muted> : null}
                      {g.teams.map((t) => (
                        <View key={t.id} style={styles.chipRow}>
                          <TeamCrest name={t.team.name} logo={t.team.logo} size={24} />
                          <Text style={[styles.chipName, { flex: 1 }]}>{t.team.name}</Text>
                          <IconButton
                            icon="close"
                            color={theme.c.textMuted}
                            size={36}
                            label={`${t.team.name} komandasını qrupdan çıxar`}
                            onPress={() => void run(() => adminChampionshipsApi.removeTeamFromGroup(g.id, t.teamId), "Komanda qrupdan çıxarıldı")}
                          />
                        </View>
                      ))}
                      {Array.from({ length: free }, (_, i) => (
                        <View key={`free-${i}`} style={styles.slot}>
                          <Text style={styles.slotText}>Boş yer</Text>
                        </View>
                      ))}
                    </Card>
                  );
                })}
              {unassigned.length > 0 ? <Muted>Qrupa təyin edilməyən: {unassigned.map((t) => t.team.name).join(", ")}</Muted> : null}
            </View>
          )}
        </>
      ) : null}

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        {playoffOnly ? (
          <Button
            title={`Playoff başla${!playoffReady && c.maxTeams ? ` (${c.teams.length}/${c.maxTeams})` : ""}`}
            icon="play"
            loading={busy}
            disabled={!playoffReady || pendingInvites.length > 0}
            onPress={() => void startPlayoffOnly()}
            fullWidth
          />
        ) : (
          <Button
            title="Çempionatı başlat"
            icon="play"
            loading={busy}
            disabled={c.groups.length === 0 || c.teams.length < GROUP_CHAMP_TEAM_MIN || pendingInvites.length > 0}
            onPress={() => void startGroupStage()}
            fullWidth
          />
        )}
        {pendingInvites.length > 0 ? (
          <InfoBox tone="orange">Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir.</InfoBox>
        ) : null}
      </View>

      <TeamPickerSheet
        visible={addOpen}
        title="Komandanı dəvət et"
        submitLabel="Dəvət göndər"
        unavailable={(team) =>
          enrolled.has(team.id) ? "Bu komanda artıq çempionatdadır" : pendingIds.has(team.id) ? "Bu komanda dəvət gözləyir" : null
        }
        onClose={() => setAddOpen(false)}
        onSubmit={async (team) => {
          if (limit != null && rosterCount >= limit) throw new Error(`Maksimum ${limit} komanda ola bilər`);
          await adminChampionshipsApi.addTeam(c.id, team.id);
          setAddOpen(false);
          toast.success("Dəvət kapitana göndərildi");
          await reload();
        }}
      />
      <CreateGroupsSheet
        visible={groupsOpen}
        teamCount={c.teams.length}
        onClose={() => setGroupsOpen(false)}
        onSubmit={async (payload) => {
          await adminChampionshipsApi.createGroups(c.id, payload);
          setGroupsOpen(false);
          toast.success("Qruplar yaradıldı");
          await reload();
        }}
      />
      <EditGroupSheet
        group={editGroup}
        onClose={() => setEditGroup(null)}
        onSubmit={async (group, payload) => {
          await adminChampionshipsApi.updateGroup(group.id, payload);
          setEditGroup(null);
          await reload();
        }}
      />
      <AddToGroupSheet
        group={addToGroup}
        options={unassigned.map((t) => ({ label: t.team.name, value: t.teamId }))}
        onClose={() => setAddToGroup(null)}
        onSubmit={async (group, teamId) => {
          await adminChampionshipsApi.addTeamToGroup(group.id, teamId);
          setAddToGroup(null);
          await reload();
        }}
      />
    </ScrollScreen>
  );
}

function ManageView({ championship: c, busy, setBusy, reload, startPlayoff }: CommonProps) {
  const toast = useToast();
  const [tab, setTab] = useState<ChampTab>("overview");
  const [scheduleMatch, setScheduleMatch] = useState<Match | null>(null);
  const navigation = useNavigation();
  const matches = useQuery(`admin:champ:${c.id}:matches`, () => adminChampionshipsApi.matches(c.id));
  const standings = useQuery(`admin:champ:${c.id}:standings`, () => adminChampionshipsApi.standings(c.id));
  const stats = useQuery(tab === "stats" ? `admin:champ:${c.id}:stats` : null, () => adminChampionshipsApi.statistics(c.id));

  const list = matches.data ?? [];
  const hasLive = list.some((m) => m.status === "LIVE");
  const nowMs = useNow(hasLive);
  usePolling(() => {
    void matches.reload();
    void standings.reload();
  }, hasLive);

  const readOnly = championshipPhase(c.status) === "FINISHED";
  const groupDone = useMemo(() => isGroupStageComplete(list), [list]);
  const tabs = championshipTabs(c);

  const finish = async () => {
    const ok = await confirm({
      title: "Çempionatı bitir",
      message: "Bu əməliyyat geri qaytarıla bilməz. Davam edilsin?",
      confirmLabel: "Bitir",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await adminChampionshipsApi.finish(c.id);
      toast.success("Çempionat bitirildi");
      await reload();
    } catch (err) {
      toast.error(errorMessage(err, "Əməliyyat uğursuz oldu"));
    } finally {
      setBusy(false);
    }
  };

  const renderMatch = (m: Match) => (
    <AdminMatchRow
      match={m}
      nowMs={nowMs}
      readOnly={readOnly}
      onSchedule={setScheduleMatch}
      onEnter={(match) => navigation.navigate("AdminMatch", { matchId: match.id })}
    />
  );

  return (
    <ScrollScreen
      refreshing={matches.refreshing}
      onRefresh={() => void Promise.all([reload(), matches.refresh(), standings.refresh(), stats.refresh()])}
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ChampionshipHeaderCard championship={c} />
        {c.status === "GROUP_STAGE" && groupDone && !readOnly ? (
          <Button
            title="Pley-off başlat"
            icon="play"
            loading={busy}
            fullWidth
            onPress={async () => {
              if (await confirm({ title: "Qrup mərhələsini bitirib playoff başlatmaq istəyirsiniz?", confirmLabel: "Başlat" })) {
                await startPlayoff(false);
                await matches.reload();
                setTab("playoff");
              }
            }}
          />
        ) : null}
        {c.status === "PLAYOFF" && !readOnly ? (
          <Button title="Çempionatı bitir" icon="flag-outline" variant="danger" loading={busy} onPress={() => void finish()} fullWidth />
        ) : null}
      </View>
      <View style={{ marginTop: spacing.md }}>
        <ChipBar items={tabs} active={tabs.some((t) => t.key === tab) ? tab : "overview"} onChange={setTab} variant="pills" />
      </View>
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
        {matches.error ? (
          <ErrorState error={matches.error} onRetry={matches.refresh} />
        ) : !matches.data || !standings.data ? (
          <LoadingView />
        ) : tab === "overview" ? (
          <OverviewView championship={c} matches={list} standings={standings.data} renderMatch={renderMatch} />
        ) : tab === "groups" ? (
          <GroupsView championship={c} matches={list} standings={standings.data} renderMatch={renderMatch} />
        ) : tab === "matches" ? (
          <AllMatchesView matches={list} renderMatch={renderMatch} />
        ) : tab === "playoff" ? (
          <PlayoffView championship={c} matches={list} renderMatch={renderMatch} />
        ) : stats.data ? (
          <StatsView players={stats.data.players} />
        ) : (
          <LoadingView />
        )}
      </View>
      <ScheduleSheet
        match={scheduleMatch}
        onClose={() => setScheduleMatch(null)}
        onSave={async (match, payload) => {
          const updated = await adminMatchesApi.updateChampionshipMatch(match.id, payload);
          matches.setData((current) => current?.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
          setScheduleMatch(null);
          toast.success("Oyun vaxtı yeniləndi");
        }}
      />
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  panel: {
    marginTop: spacing.md,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  panelTitle: { fontFamily: ff.bold, fontSize: 14, color: c.ink },
  panelSub: { fontFamily: ff.regular, fontSize: 12, lineHeight: 17, color: c.textMuted, marginTop: 3 },
  item: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, marginTop: 8 },
  name: { fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  sub: { fontSize: 12, fontFamily: ff.regular, color: c.textMuted, marginTop: 1 },
  count: { height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: c.cardMuted, justifyContent: "center" },
  countText: { fontFamily: ff.bold, fontSize: 11, color: c.textMuted },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 10, minHeight: 42, borderRadius: 10, backgroundColor: c.cardMuted },
  chipRowPending: { backgroundColor: c.amberSoft },
  chipName: { fontFamily: ff.semibold, fontSize: 13, color: c.ink },
  slot: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  slotText: { fontFamily: ff.medium, fontSize: 12, color: c.textFaint },
}));
