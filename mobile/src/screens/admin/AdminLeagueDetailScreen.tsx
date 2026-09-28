import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../../api/errors";
import { adminLeaguesApi, leaguesApi } from "../../api/leagues";
import { adminMatchesApi } from "../../api/matches";
import { BottomSheet } from "../../components/BottomSheet";
import { ChipBar } from "../../components/ChipBar";
import { confirm, OptionCards } from "../../components/fields";
import { RoundPager } from "../../components/RoundPager";
import { ScrollScreen } from "../../components/Screen";
import { EmptyState, ErrorState, LoadingView } from "../../components/states";
import { PlayerStatList, StandingsTable } from "../../components/tables";
import { Button, InfoBox, Row, TeamCrest } from "../../components/ui";
import { useSocketEvent } from "../../context/RealtimeContext";
import { useToast } from "../../context/ToastContext";
import { useNow, usePolling } from "../../hooks/timers";
import { useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { cardShadow, display, ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { MatchFormat } from "../../types/common";
import type { Match } from "../../types/match";
import { buildRounds, hasUnfinished, leagueFixturePreview } from "../../utils/rounds";
import {
  EMPTY_STAT_TEXT,
  LEAGUE_TABS,
  LeagueHeader,
  playerTable,
  toStandingItems,
  type LeagueTab,
} from "../league/LeagueDetailScreen";
import { AdminMatchRow } from "./AdminMatchRow";
import { ScheduleSheet } from "./ScheduleSheet";
import { TeamPickerSheet } from "./TeamPickerSheet";

export function AdminLeagueDetailScreen({ route, navigation }: RootScreenProps<"AdminLeagueDetail">) {
  const { leagueId } = route.params;
  const toast = useToast();
  const { c } = useTheme();
  const styles = useStyles();
  const [tab, setTab] = useState<LeagueTab>("standings");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [format, setFormat] = useState<MatchFormat>("SINGLE");
  const [scheduleMatch, setScheduleMatch] = useState<Match | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const league = useQuery(`league:${leagueId}`, () => leaguesApi.get(leagueId));
  const standings = useQuery(`league:${leagueId}:standings`, () => leaguesApi.standings(leagueId));
  const matches = useQuery(`admin:league:${leagueId}:matches`, () => adminLeaguesApi.matches(leagueId));
  const players = useQuery(`league:${leagueId}:players`, () => leaguesApi.players(leagueId));
  const invites = useQuery(`admin:league:${leagueId}:invites`, () => adminLeaguesApi.invites(leagueId));
  const joins = useQuery(`admin:league:${leagueId}:joins`, () => adminLeaguesApi.joinRequests(leagueId));

  const reloadAll = useCallback(async () => {
    await Promise.all([league.reload(), standings.reload(), matches.reload(), players.reload(), invites.reload(), joins.reload()]);
  }, [league, standings, matches, players, invites, joins]);

  // Captains answering invites / sending join requests arrive as notifications.
  useSocketEvent("notification_received", ({ notification }) => {
    if (notification.type === "JOIN_REQUEST" || notification.type === "LEAGUE_INVITE") void reloadAll();
  });

  useEffect(() => {
    if (league.data) navigation.setOptions({ title: league.data.name });
  }, [navigation, league.data]);

  const matchList = matches.data ?? [];
  const hasLive = matchList.some((m) => m.status === "LIVE");
  const nowMs = useNow(hasLive && tab === "matches");
  usePolling(() => void matches.reload(), hasLive);
  const rounds = useMemo(() => buildRounds(matchList), [matchList]);

  if (league.loading) return <LoadingView />;
  if (league.error || !league.data) return <ErrorState error={league.error} onRetry={league.refresh} />;

  const l = league.data;
  const teamRows = standings.data?.standings ?? [];
  const pendingInvites = (invites.data ?? []).filter((i) => i.status === "PENDING");
  const pendingJoins = (joins.data ?? []).filter((j) => j.status === "PENDING");
  const enrolled = new Set(teamRows.map((r) => r.teamId));
  const invited = new Set(pendingInvites.map((i) => i.team.id));
  const unfinished = hasUnfinished(matchList);
  const single = leagueFixturePreview(teamRows.length, false);
  const homeAway = leagueFixturePreview(teamRows.length, true);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      await reloadAll();
    } catch (err) {
      toast.error(errorMessage(err, "Əməliyyat alınmadı"));
    } finally {
      setBusy(null);
    }
  };

  const startLeague = async () => {
    if (pendingInvites.length > 0) {
      toast.error("Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir.");
      return;
    }
    if (teamRows.length < 2) {
      toast.error("Liqanı başlatmaq üçün ən azı 2 komanda lazımdır");
      return;
    }
    setStartOpen(false);
    await run("start", () => adminLeaguesApi.start(leagueId, format), "Liqa başladıldı");
  };

  const finishLeague = async () => {
    if (unfinished > 0) {
      toast.error(`Liqada hələ tamamlanmamış ${unfinished} oyun var. Liqanı bitirmək üçün bütün oyunlar tamamlanmalıdır.`);
      return;
    }
    const ok = await confirm({
      title: "Liqanı bitir",
      message: "Bu əməliyyatdan sonra liqa tamamlanmış kimi işarələnəcək.",
      confirmLabel: "Bitir",
      destructive: true,
    });
    if (ok) await run("finish", () => adminLeaguesApi.finish(leagueId), "Liqa bitirildi");
  };

  const removeTeam = async (teamId: number, name: string) => {
    const ok = await confirm({
      title: `${name} silinsin?`,
      message: "Komanda liqadan çıxarılacaq, sistemdən silinməyəcək.",
      confirmLabel: "Sil",
      destructive: true,
    });
    if (ok) await run(`remove-${teamId}`, () => adminLeaguesApi.removeTeam(leagueId, teamId), "Komanda liqadan çıxarıldı");
  };

  const refreshAll = () =>
    void Promise.all([league.refresh(), standings.refresh(), matches.refresh(), players.refresh(), invites.refresh(), joins.refresh()]);

  return (
    <ScrollScreen refreshing={league.refreshing} onRefresh={refreshAll} contentStyle={{ paddingHorizontal: 0 }}>
      <View style={styles.pad}>
        <LeagueHeader league={l} />
        {l.status === "DRAFT" ? (
          <Row>
            <Button title="Komanda dəvət et" icon="add" size="sm" variant="soft" onPress={() => setInviteOpen(true)} style={{ flex: 1 }} />
            <Button
              title="Liqanı başlat"
              icon="play"
              size="sm"
              loading={busy === "start"}
              disabled={teamRows.length < 2 || pendingInvites.length > 0}
              onPress={() => {
                setFormat(l.matchFormat ?? "SINGLE");
                setStartOpen(true);
              }}
              style={{ flex: 1 }}
            />
          </Row>
        ) : null}
        {l.status === "ACTIVE" ? (
          <Button title="Liqanı bitir" icon="flag-outline" size="sm" variant="danger" loading={busy === "finish"} onPress={() => void finishLeague()} fullWidth />
        ) : null}
        {l.status === "DRAFT" && pendingInvites.length > 0 ? (
          <View style={{ marginTop: spacing.md }}>
            <InfoBox tone="orange">Gözləyən dəvətlər var. Əvvəlcə dəvətlər qəbul olunmalı və ya ləğv edilməlidir.</InfoBox>
          </View>
        ) : null}

        {l.status === "DRAFT" && pendingJoins.length > 0 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Qoşulma sorğuları ({pendingJoins.length})</Text>
            <Text style={styles.panelSub}>Planlaşdırılan liqaya komanda kapitanlarından gələn sorğular</Text>
            {pendingJoins.map((r) => (
              <View key={r.id} style={styles.request}>
                <Row gap={spacing.md}>
                  <TeamCrest name={r.team.name} logo={r.team.logo} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{r.team.name}</Text>
                    <Text style={styles.sub}>
                      @{r.requestedBy.username} · {r.team.city || "Şəhər yoxdur"}
                    </Text>
                  </View>
                </Row>
                <Row style={{ marginTop: 10 }}>
                  <Button
                    title="Qəbul"
                    icon="checkmark"
                    size="sm"
                    disabled={busy != null}
                    onPress={() => void run(`join-${r.id}`, () => adminLeaguesApi.respondJoinRequest(r.id, "accept"), "Sorğu qəbul edildi")}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Rədd"
                    icon="close"
                    size="sm"
                    variant="soft"
                    disabled={busy != null}
                    onPress={() => void run(`join-${r.id}`, () => adminLeaguesApi.respondJoinRequest(r.id, "reject"), "Sorğu rədd edildi")}
                    style={{ flex: 1 }}
                  />
                </Row>
              </View>
            ))}
          </View>
        ) : null}

        {l.status === "DRAFT" && pendingInvites.length > 0 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Gözləyən dəvətlər ({pendingInvites.length})</Text>
            <Text style={styles.panelSub}>
              Kapitanın təsdiqini gözləyən dəvətlər. Ləğv etsəniz, komanda artıq qəbul edə bilməz. Liqa bu dəvətlər qəbul olunmadan və ya ləğv edilmədən başladılmır.
            </Text>
            {pendingInvites.map((i) => (
              <Row key={i.id} gap={spacing.md} style={styles.request}>
                <TeamCrest name={i.team.name} logo={i.team.logo} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{i.team.name}</Text>
                  <Text style={[styles.sub, { color: c.amber }]}>Kapitanın təsdiqi gözlənilir</Text>
                </View>
                <Button
                  title="Ləğv et"
                  icon="close"
                  size="sm"
                  variant="danger"
                  disabled={busy != null}
                  onPress={() => void run(`inv-${i.id}`, () => adminLeaguesApi.cancelInvite(leagueId, i.id), "Dəvət ləğv edildi")}
                />
              </Row>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.md }}>
        <ChipBar items={LEAGUE_TABS} active={tab} onChange={setTab} variant="pills" />
      </View>

      <View style={[styles.pad, { marginTop: spacing.sm }]}>
        {tab === "standings" ? (
          teamRows.length === 0 ? (
            <EmptyState icon="people-outline" title="Hələ komanda yoxdur" description={l.status === "DRAFT" ? "Komanda dəvət edin və ya qoşulma sorğularını qəbul edin." : undefined} />
          ) : l.status === "DRAFT" ? (
            <View style={styles.panel}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.panelTitle}>Turnir cədvəli</Text>
                <Text style={styles.sub}>{teamRows.length} komanda</Text>
              </Row>
              <Text style={styles.panelSub}>Liqa başlamazdan əvvəl komandanı çıxara bilərsiniz.</Text>
              {teamRows.map((r) => (
                <Row key={r.teamId} gap={spacing.md} style={styles.request}>
                  <TeamCrest name={r.teamName} logo={r.logo} size={30} />
                  <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate("LeagueTeam", { leagueId, teamId: r.teamId })} accessibilityRole="link">
                    <Text style={styles.name}>{r.teamName}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void removeTeam(r.teamId, r.teamName)}
                    disabled={busy != null}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.teamName} komandasını liqadan çıxar`}
                    hitSlop={8}
                    style={styles.trash}
                  >
                    <Ionicons name="trash-outline" size={16} color={c.red} />
                  </Pressable>
                </Row>
              ))}
            </View>
          ) : (
            <StandingsTable rows={toStandingItems(teamRows)} onPressTeam={(teamId) => navigation.navigate("LeagueTeam", { leagueId, teamId })} />
          )
        ) : null}

        {tab === "matches" ? (
          matches.error ? (
            <ErrorState error={matches.error} onRetry={matches.refresh} />
          ) : rounds.length === 0 ? (
            <EmptyState icon="football-outline" title="Bu liqada hələ oyun yoxdur." description="Liqanı başlatdıqda oyunlar avtomatik yaranacaq." />
          ) : (
            <RoundPager
              rounds={rounds}
              renderMatch={(m) => (
                <AdminMatchRow
                  match={m}
                  nowMs={nowMs}
                  readOnly={l.status === "FINISHED"}
                  onSchedule={setScheduleMatch}
                  onEnter={(match) => navigation.navigate("AdminMatch", { matchId: match.id })}
                />
              )}
            />
          )
        ) : null}

        {tab === "goals" || tab === "assists" || tab === "ga" ? (
          (() => {
            const rows = playerTable(players.data ?? [], tab);
            return rows.length === 0 ? <EmptyState icon="stats-chart-outline" title={EMPTY_STAT_TEXT[tab]} /> : <PlayerStatList rows={rows} metric={tab} />;
          })()
        ) : null}
      </View>

      <TeamPickerSheet
        visible={inviteOpen}
        title="Komandanı liqaya dəvət et"
        submitLabel="Dəvət göndər"
        withMessage
        unavailable={(team) => (enrolled.has(team.id) ? "Bu komanda artıq liqadadır" : invited.has(team.id) ? "Bu komanda dəvət gözləyir" : null)}
        onClose={() => setInviteOpen(false)}
        onSubmit={async (team, message) => {
          await adminLeaguesApi.inviteTeam(leagueId, { teamId: team.id, message: message || undefined });
          setInviteOpen(false);
          toast.success("Dəvət kapitana göndərildi");
          await reloadAll();
        }}
      />

      <BottomSheet
        visible={startOpen}
        title="Liqanı başlat"
        onClose={() => setStartOpen(false)}
        footer={
          <>
            <Button title="Ləğv et" variant="soft" onPress={() => setStartOpen(false)} />
            <Button title="Başlat" icon="play" onPress={() => void startLeague()} style={{ flex: 1 }} />
          </>
        }
      >
        <View style={styles.summary}>
          <Ionicons name="people-outline" size={16} color={c.brandInk} />
          <Text style={[styles.name, { flex: 1 }]}>{teamRows.length} komanda qoşulub</Text>
          <Text style={styles.summaryValue}>{(format === "HOME_AWAY" ? homeAway : single).matches} oyun</Text>
        </View>
        <OptionCards
          label="Format"
          value={format}
          onChange={setFormat}
          options={[
            { label: "1 oyun", value: "SINGLE", description: `Hər cüt bir dəfə · ${single.rounds} tur · ${single.matches} oyun` },
            { label: "Ev-səfər", value: "HOME_AWAY", description: `İki oyun · ${homeAway.rounds} tur · ${homeAway.matches} oyun` },
          ]}
        />
        <InfoBox tone="blue">
          Liqa başladıqdan sonra yeni komanda əlavə etmək mümkün olmayacaq. İştirakçı komandalar kilidlənəcək və oyunlar avtomatik yaranacaq.
        </InfoBox>
      </BottomSheet>

      <ScheduleSheet
        match={scheduleMatch}
        onClose={() => setScheduleMatch(null)}
        onSave={async (match, payload) => {
          const updated = await adminMatchesApi.update(match.id, payload);
          matches.setData((list) => list?.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
          setScheduleMatch(null);
          toast.success("Oyun vaxtı yeniləndi");
        }}
      />
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  pad: { paddingHorizontal: spacing.lg },
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
  panelSub: { fontFamily: ff.regular, fontSize: 12, lineHeight: 17, color: c.textMuted, marginTop: 3, marginBottom: 4 },
  request: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, marginTop: 8 },
  name: { fontSize: 14, fontFamily: ff.bold, color: c.ink },
  sub: { fontSize: 12, fontFamily: ff.regular, color: c.textMuted, marginTop: 1 },
  trash: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  summary: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: c.cardMuted, marginBottom: spacing.lg },
  summaryValue: { ...display(17, "bold"), color: c.ink, fontSize: font.md + 1 },
}));
