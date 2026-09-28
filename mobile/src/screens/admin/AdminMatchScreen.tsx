import { useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, Text, View } from "react-native";
import { errorMessage } from "../../api/errors";
import { leaguesApi } from "../../api/leagues";
import { adminMatchesApi, matchesApi } from "../../api/matches";
import { teamsApi } from "../../api/teams";
import { BottomSheet } from "../../components/BottomSheet";
import { confirm, SegmentedField, SelectField } from "../../components/fields";
import { ScrollScreen } from "../../components/Screen";
import { ErrorState, LoadingView } from "../../components/states";
import { Button, IconTile, InfoBox, Muted, SectionTitle, TextField, type IconName } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { useNow } from "../../hooks/timers";
import { useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { ff, radius, spacing, type Tone } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import type { Match, MatchEvent, MatchEventPayload } from "../../types/match";
import {
  computeMatchClock,
  EVENT_MINUTE_MAX,
  EVENT_MINUTE_MIN,
  isFixtureReady,
  MATCH_CLOCK_MAX_MINUTES,
  serverOffset,
  suggestedEventMinute,
} from "../../utils/matchClock";
import { EventsTimeline, eventTitle, MatchScoreboard } from "../match/MatchParts";

type Kind = "GOAL" | "CARD" | "SUB" | "NOTE";
type PlayerOption = { id: number; label: string };

function kindOf(type: MatchEvent["type"]): Kind {
  if (type === "GOAL" || type === "OWN_GOAL") return "GOAL";
  if (type === "YELLOW_CARD" || type === "RED_CARD") return "CARD";
  if (type === "SUBSTITUTION") return "SUB";
  return "NOTE";
}

const KIND_TITLE: Record<Kind, string> = { GOAL: "Qol", CARD: "Kart", SUB: "Dəyişiklik", NOTE: "Qeyd" };
const KIND_ICON: Record<Kind, IconName> = { GOAL: "football-outline", CARD: "warning-outline", SUB: "swap-horizontal", NOTE: "document-text-outline" };
const KIND_TONE: Record<Kind, Tone> = { GOAL: "lime", CARD: "orange", SUB: "blue", NOTE: "violet" };

/**
 * Admin match console. All rules (who may start/finish, edit windows, stage
 * locks, event minute range) are enforced by the backend; the flags it returns
 * (`canEdit`, `eventsWritable`, `stageLocked`, `isLocked`) only drive the UI.
 */
export function AdminMatchScreen({ route, navigation }: RootScreenProps<"AdminMatch">) {
  const { matchId } = route.params;
  const toast = useToast();
  const styles = useStyles();
  const fetchedAt = useRef(Date.now());
  const query = useQuery(`admin:match:${matchId}`, async () => {
    const data = await matchesApi.get(matchId);
    fetchedAt.current = Date.now();
    return data;
  });
  const match = query.data;
  const [busy, setBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sheet, setSheet] = useState<{ kind: Kind; event?: MatchEvent } | null>(null);

  const rosterKey = match ? `admin:match:${matchId}:rosters:${match.homeTeamId}:${match.awayTeamId}` : null;
  const rosters = useQuery(rosterKey, async (): Promise<Record<number, PlayerOption[]>> => {
    if (!match) return {};
    const load = async (teamId: number): Promise<PlayerOption[]> => {
      const players = match.leagueId
        ? (await leaguesApi.team(match.leagueId, teamId)).players
        : (await teamsApi.get(teamId)).players;
      return players.map((p) => ({
        id: p.id,
        label: `${p.shirtNumber != null ? `#${p.shirtNumber} ` : ""}${p.firstName} ${p.lastName}`.trim(),
      }));
    };
    const [home, away] = await Promise.all([load(match.homeTeamId), load(match.awayTeamId)]);
    return { [match.homeTeamId]: home, [match.awayTeamId]: away };
  });

  const live = match?.status === "LIVE";
  const nowMs = useNow(live);
  const clock = useMemo(
    () => (match ? computeMatchClock(match, nowMs + serverOffset(match, fetchedAt.current)) : null),
    [match, nowMs],
  );

  // The backend auto-finishes a LIVE match at 120 minutes; pick that up.
  const expired = live && clock != null && clock.elapsedSeconds >= MATCH_CLOCK_MAX_MINUTES * 60;
  useEffect(() => {
    if (!expired) return;
    const id = setTimeout(() => void query.reload(), 2000);
    return () => clearTimeout(id);
  }, [expired, query]);

  useEffect(() => {
    if (match) navigation.setOptions({ title: `${match.homeTeam.name} – ${match.awayTeam.name}` });
  }, [navigation, match]);

  if (query.loading) return <LoadingView />;
  if (query.error || !match) return <ErrorState error={query.error} onRetry={query.refresh} />;

  const apply = (next: Match) => {
    fetchedAt.current = Date.now();
    query.setData(() => next);
  };

  const changeStatus = async (status: "LIVE" | "FINISHED") => {
    const ok = await confirm(
      status === "LIVE"
        ? { title: "Oyunu başlat", message: "Oyun saatı işə düşəcək. Davam edilsin?", confirmLabel: "Başlat" }
        : { title: "Oyunu bitir", message: "Oyun bitmiş kimi qeyd olunacaq. Davam edilsin?", confirmLabel: "Bitir", destructive: true },
    );
    if (!ok) return;
    setBusy(true);
    try {
      apply(await adminMatchesApi.update(match.id, { status }));
      toast.success(status === "LIVE" ? "Oyun başladı" : "Oyun bitdi");
    } catch (err) {
      toast.error(errorMessage(err, "Yenilənmədi"));
    } finally {
      setBusy(false);
    }
  };

  const writable =
    (match.status === "LIVE" || (match.status === "FINISHED" && editMode)) &&
    (match.eventsWritable ?? true) &&
    !match.stageLocked &&
    !match.isLocked;

  const onPressEvent = (event: MatchEvent) => {
    if (!writable) return;
    const edit = () => setSheet({ kind: kindOf(event.type), event });
    const remove = async () => {
      const ok = await confirm({ title: `${eventTitle(event.type)} silinsin?`, confirmLabel: "Sil", destructive: true });
      if (!ok) return;
      setBusy(true);
      try {
        apply(await adminMatchesApi.deleteEvent(match.id, event.id));
        toast.success("Hadisə silindi");
      } catch (err) {
        toast.error(errorMessage(err, "Silinmədi"));
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["İmtina", "Dəyiş", "Sil"], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
        (i) => (i === 1 ? edit() : i === 2 ? void remove() : undefined),
      );
    } else {
      Alert.alert(eventTitle(event.type), undefined, [
        { text: "İmtina", style: "cancel" },
        { text: "Dəyiş", onPress: edit },
        { text: "Sil", style: "destructive", onPress: () => void remove() },
      ]);
    }
  };

  return (
    <ScrollScreen refreshing={query.refreshing} onRefresh={query.refresh}>
      <MatchScoreboard match={match} clock={clock} />

      <View style={styles.actions}>
        {match.status === "SCHEDULED" ? (
          <Button title="Oyunu başlat" icon="play" loading={busy} disabled={!isFixtureReady(match)} onPress={() => void changeStatus("LIVE")} fullWidth />
        ) : null}
        {match.status === "LIVE" ? (
          <Button title="Oyunu bitir" icon="stop" variant="stop" loading={busy} onPress={() => void changeStatus("FINISHED")} fullWidth />
        ) : null}
        {match.status === "FINISHED" && match.canEdit && !editMode ? (
          <Button
            title="Redaktə et"
            icon="create-outline"
            variant="soft"
            fullWidth
            onPress={async () => {
              const ok = await confirm({
                title: "Oyunu redaktə et",
                message: "Bu bitmiş oyunu redaktə etmək istədiyinizə əminsiniz? Statistika hadisələrə görə yenidən hesablanacaq.",
                confirmLabel: "Redaktə et",
              });
              if (ok) setEditMode(true);
            }}
          />
        ) : null}
        {editMode ? <Button title="Redaktəni bitir" icon="checkmark" variant="success" onPress={() => setEditMode(false)} fullWidth /> : null}
        {match.status === "SCHEDULED" && !isFixtureReady(match) ? <InfoBox tone="orange">Əvvəlcə vaxt və məkan təyin edin.</InfoBox> : null}
        {match.status === "FINISHED" && !match.canEdit ? <Muted>Bitmiş oyunu redaktə etmək olmur.</Muted> : null}
      </View>

      {match.status !== "CANCELLED" && match.status !== "POSTPONED" && (writable || match.status === "SCHEDULED") ? (
        <View style={[styles.tiles, !writable && { opacity: 0.45 }]}>
          {(["GOAL", "CARD", "SUB", "NOTE"] as Kind[]).map((kind) => (
            <Pressable
              key={kind}
              disabled={!writable}
              onPress={() => setSheet({ kind })}
              accessibilityRole="button"
              accessibilityLabel={`${KIND_TITLE[kind]} əlavə et`}
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
            >
              <IconTile icon={KIND_ICON[kind]} tone={KIND_TONE[kind]} size={36} />
              <Text style={styles.tileText}>{KIND_TITLE[kind]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {match.status === "SCHEDULED" ? <Text style={styles.tilesHint}>Hadisə əlavə etmək üçün əvvəlcə oyunu başladın</Text> : null}

      <SectionTitle count={match.events?.length ?? 0}>Hadisələr</SectionTitle>
      {(match.events?.length ?? 0) === 0 && writable ? <Muted style={{ marginBottom: spacing.sm }}>Hələ hadisə yoxdur. Qol və ya kart əlavə edərək başlayın.</Muted> : null}
      <EventsTimeline match={match} onPressEvent={writable ? onPressEvent : undefined} />

      <EventSheet
        state={sheet}
        match={match}
        rosters={rosters.data ?? {}}
        defaultMinute={suggestedEventMinute(clock)}
        onClose={() => setSheet(null)}
        onSubmit={async (payload, event) => {
          const result = event
            ? await adminMatchesApi.updateEvent(match.id, event.id, payload)
            : await adminMatchesApi.addEvent(match.id, payload);
          apply(result.match);
          setSheet(null);
          toast.success(event ? "Hadisə yeniləndi" : "Hadisə əlavə olundu");
        }}
      />
    </ScrollScreen>
  );
}

function EventSheet({
  state,
  match,
  rosters,
  defaultMinute,
  onClose,
  onSubmit,
}: {
  state: { kind: Kind; event?: MatchEvent } | null;
  match: Match;
  rosters: Record<number, PlayerOption[]>;
  defaultMinute: number;
  onClose: () => void;
  onSubmit: (payload: MatchEventPayload, event?: MatchEvent) => Promise<void>;
}) {
  const [minute, setMinute] = useState("1");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [assistId, setAssistId] = useState<number | null>(null);
  const [inId, setInId] = useState<number | null>(null);
  const [outId, setOutId] = useState<number | null>(null);
  const [card, setCard] = useState<"YELLOW_CARD" | "RED_CARD">("YELLOW_CARD");
  const [ownGoal, setOwnGoal] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    const e = state.event;
    setMinute(String(e?.minute ?? defaultMinute));
    setTeamId(e ? e.teamId : state.kind === "NOTE" ? null : match.homeTeamId);
    setPlayerId(e?.playerId ?? null);
    setAssistId(e?.assistPlayerId ?? null);
    setInId(e?.playerInId ?? null);
    setOutId(e?.playerOutId ?? null);
    setCard(e?.type === "RED_CARD" ? "RED_CARD" : "YELLOW_CARD");
    setOwnGoal(e?.type === "OWN_GOAL");
    setNote(e?.note ?? "");
    setError(null);
    // defaultMinute intentionally read once when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, match.homeTeamId]);

  if (!state) return <BottomSheet visible={false} title="" onClose={onClose}>{null}</BottomSheet>;
  const { kind, event } = state;
  const players = teamId ? rosters[teamId] ?? [] : [];
  const playerOptions = players.map((p) => ({ label: p.label, value: p.id }));
  const teamOptions = [
    { label: match.homeTeam.name, value: match.homeTeamId },
    { label: match.awayTeam.name, value: match.awayTeamId },
  ];

  const submit = async () => {
    const m = Number(minute);
    if (!Number.isInteger(m) || m < EVENT_MINUTE_MIN || m > EVENT_MINUTE_MAX) {
      return setError(`Dəqiqə ${EVENT_MINUTE_MIN}–${EVENT_MINUTE_MAX} arası olmalıdır`);
    }
    if (!teamId) return setError("Komanda seçin");
    let payload: MatchEventPayload;
    if (kind === "GOAL") {
      if (!playerId) return setError("Oyunçu seçin");
      payload = {
        type: ownGoal ? "OWN_GOAL" : "GOAL",
        minute: m,
        teamId,
        playerId,
        assistPlayerId: !ownGoal && assistId ? assistId : undefined,
      };
    } else if (kind === "CARD") {
      if (!playerId) return setError("Oyunçu seçin");
      payload = { type: card, minute: m, teamId, playerId };
    } else if (kind === "SUB") {
      if (!inId || !outId) return setError("Komanda və hər iki oyunçu lazımdır");
      payload = { type: "SUBSTITUTION", minute: m, teamId, playerInId: inId, playerOutId: outId };
    } else {
      payload = { type: "NOTE", minute: m, teamId, note: note.trim() || undefined };
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(payload, event);
    } catch (err) {
      setError(errorMessage(err, "Hadisə əlavə olunmadı"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible
      title={`${KIND_TITLE[kind]}${event ? " — dəyiş" : " əlavə et"}`}
      onClose={onClose}
      busy={busy}
      footer={<Button title="Yadda saxla" icon="checkmark" loading={busy} onPress={() => void submit()} style={{ flex: 1 }} />}
    >
      <TextField label="Dəqiqə" value={minute} onChangeText={(v) => setMinute(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={3} hint={`${EVENT_MINUTE_MIN}–${EVENT_MINUTE_MAX}`} />
      <SegmentedField
        label="Komanda"
        value={String(teamId ?? "")}
        options={teamOptions.map((o) => ({ label: o.label, value: String(o.value) }))}
        onChange={(v) => {
          setTeamId(Number(v));
          setPlayerId(null);
          setAssistId(null);
          setInId(null);
          setOutId(null);
        }}
      />
      {kind === "GOAL" ? (
        <>
          <SegmentedField
            label="Növ"
            value={ownGoal ? "own" : "goal"}
            onChange={(v) => setOwnGoal(v === "own")}
            options={[
              { label: "Qol", value: "goal" },
              { label: "Avtoqol", value: "own" },
            ]}
          />
          <SelectField label="Oyunçu" value={playerId} options={playerOptions} onChange={setPlayerId} placeholder="Oyunçu seçin" />
          {!ownGoal ? (
            <SelectField
              label="Asist"
              value={assistId}
              options={[{ label: "Yoxdur", value: 0 }, ...playerOptions.filter((o) => o.value !== playerId)]}
              onChange={(v) => setAssistId(v || null)}
              placeholder="Yoxdur"
            />
          ) : null}
        </>
      ) : null}
      {kind === "CARD" ? (
        <>
          <SegmentedField
            label="Kart növü"
            value={card}
            onChange={setCard}
            options={[
              { label: "Sarı", value: "YELLOW_CARD" },
              { label: "Qırmızı", value: "RED_CARD" },
            ]}
          />
          <SelectField label="Oyunçu" value={playerId} options={playerOptions} onChange={setPlayerId} placeholder="Oyunçu seçin" />
        </>
      ) : null}
      {kind === "SUB" ? (
        <>
          <SelectField label="Çıxan oyunçu" value={outId} options={playerOptions} onChange={setOutId} placeholder="Oyunçu seçin" />
          <SelectField label="Daxil olan oyunçu" value={inId} options={playerOptions.filter((o) => o.value !== outId)} onChange={setInId} placeholder="Oyunçu seçin" />
        </>
      ) : null}
      {kind === "NOTE" ? <TextField label="Qeyd" value={note} onChangeText={setNote} multiline maxLength={300} /> : null}
      {teamId && players.length === 0 && kind !== "NOTE" ? <Muted>Bu komandada oyunçu tapılmadı.</Muted> : null}
      {error ? <InfoBox tone="red">{error}</InfoBox> : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) => ({
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  tiles: { flexDirection: "row", gap: 8, marginTop: spacing.lg },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  tileText: { fontFamily: ff.semibold, fontSize: 12, color: c.ink },
  tilesHint: { fontFamily: ff.regular, fontSize: 11.5, color: c.textFaint, textAlign: "center", marginTop: 8 },
  sheetRadius: { borderRadius: radius.md },
}));
