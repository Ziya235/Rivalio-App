import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../../api/errors";
import { BottomSheet } from "../../components/BottomSheet";
import { SegmentedField, SelectField, SwitchRow } from "../../components/fields";
import { Button, InfoBox, Muted, Row, TextField } from "../../components/ui";
import { ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { ChampionshipGroup, CreateGroupsPayload, PlayoffTieGroup } from "../../types/championship";

// Limits from frontend/src/lib/championshipGroups.ts (the backend validates again).
export const GROUP_CHAMP_TEAM_MIN = 6;
export const GROUP_CHAMP_TEAM_MAX = 20;
const GROUP_COUNT_MIN = 2;
const GROUP_COUNT_MAX = 4;
const GROUP_CAPACITY_MIN = 3;
const GROUP_CAPACITY_MAX = 7;

export function validateGroupSlots(teamCount: number, groupCount: number, slots: number[], sameSlots: boolean): string | null {
  if (teamCount < GROUP_CHAMP_TEAM_MIN) return `Qrup yaratmaq üçün ən azı ${GROUP_CHAMP_TEAM_MIN} komanda lazımdır`;
  if (teamCount > GROUP_CHAMP_TEAM_MAX) return `Maksimum ${GROUP_CHAMP_TEAM_MAX} komanda ola bilər`;
  if (!Number.isInteger(groupCount) || groupCount < GROUP_COUNT_MIN || groupCount > GROUP_COUNT_MAX) {
    return "Qrup sayı 2–4 aralığında olmalıdır.";
  }
  if (slots.length !== groupCount) return "Hər qrup üçün tutum göstərilməlidir.";
  if (slots.some((s) => !Number.isInteger(s) || s < GROUP_CAPACITY_MIN || s > GROUP_CAPACITY_MAX)) {
    return "Qrup tutumu 3–7 aralığında olmalıdır.";
  }
  const total = slots.reduce((sum, s) => sum + s, 0);
  if (sameSlots && teamCount % slots[0] !== 0) return "Komanda sayı seçilmiş qrup tutumuna uyğun deyil.";
  if (teamCount < total) return "Komanda sayı qruplardakı ümumi slot sayından azdır.";
  if (teamCount > total) return "Komanda sayı seçilmiş qrup tutumuna uyğun deyil.";
  return null;
}

const COUNT_OPTIONS = ["2", "3", "4"].map((v) => ({ label: `${v} qrup`, value: v }));
const CAPACITY_OPTIONS = ["3", "4", "5", "6", "7"].map((v) => ({ label: v, value: v }));

export function CreateGroupsSheet({
  visible,
  teamCount,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  teamCount: number;
  onClose: () => void;
  onSubmit: (payload: CreateGroupsPayload) => Promise<void>;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const [count, setCount] = useState("2");
  const [mode, setMode] = useState<"same" | "perGroup">("same");
  const [same, setSame] = useState("4");
  const [perGroup, setPerGroup] = useState<string[]>(["4", "4", "4", "4"]);
  const [autoAssign, setAutoAssign] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setError(null);
  }, [visible]);

  const groupCount = Number(count);
  const slots = mode === "same" ? Array.from({ length: groupCount }, () => Number(same)) : perGroup.slice(0, groupCount).map(Number);
  const validation = validateGroupSlots(teamCount, groupCount, slots, mode === "same");

  const submit = async () => {
    if (validation) return setError(validation);
    setBusy(true);
    setError(null);
    try {
      await onSubmit(
        mode === "same"
          ? { groupCount, teamSlots: Number(same), autoAssign }
          : { groupCount, perGroupSlots: slots, autoAssign },
      );
    } catch (err) {
      setError(errorMessage(err, "Qruplar yaradılmadı"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Qrup yarat"
      onClose={onClose}
      busy={busy}
      footer={<Button title="Yarat" icon="grid-outline" loading={busy} onPress={() => void submit()} style={{ flex: 1 }} />}
    >
      <Muted style={{ marginBottom: spacing.md }}>{teamCount} komanda qeydiyyatdadır.</Muted>
      <SegmentedField label="Qrup sayı" value={count} options={COUNT_OPTIONS} onChange={setCount} />
      <SegmentedField
        label="Slot rejimi"
        value={mode}
        onChange={setMode}
        options={[
          { label: "Hər qrupda eyni", value: "same" },
          { label: "Qrup üzrə", value: "perGroup" },
        ]}
      />
      {mode === "same" ? (
        <SegmentedField label="Qrup tutumu" value={same} options={CAPACITY_OPTIONS} onChange={setSame} />
      ) : (
        Array.from({ length: groupCount }, (_, i) => (
          <SegmentedField
            key={i}
            label={`Qrup ${String.fromCharCode(65 + i)} tutumu`}
            value={perGroup[i]}
            options={CAPACITY_OPTIONS}
            onChange={(v) => setPerGroup((prev) => prev.map((p, j) => (j === i ? v : p)))}
          />
        ))
      )}
      <SwitchRow label="Komandaları avtomatik payla" value={autoAssign} onChange={setAutoAssign} />
      <View style={[styles.summary, validation ? styles.summaryWarn : styles.summaryOk]}>
        <Ionicons name={validation ? "warning-outline" : "checkmark-circle-outline"} size={16} color={validation ? c.amber : c.brandInk} />
        <Text style={[styles.hint, { color: validation ? c.amber : c.brandInk }]}>
        {validation ?? `Cəmi ${slots.reduce((a, b) => a + b, 0)} yer · ${teamCount} komanda — uyğundur`}
        </Text>
      </View>
      {error ? <View style={{ marginTop: spacing.sm }}><InfoBox tone="red">{error}</InfoBox></View> : null}
    </BottomSheet>
  );
}

export function EditGroupSheet({
  group,
  onClose,
  onSubmit,
}: {
  group: ChampionshipGroup | null;
  onClose: () => void;
  onSubmit: (group: ChampionshipGroup, payload: { name: string; teamSlots: number }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slots, setSlots] = useState("4");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setSlots(String(group.teamSlots ?? GROUP_CAPACITY_MIN));
    setError(null);
  }, [group]);

  const submit = async () => {
    if (!group) return;
    if (!name.trim()) return setError("Ad boş ola bilməz");
    setBusy(true);
    try {
      await onSubmit(group, { name: name.trim(), teamSlots: Number(slots) });
    } catch (err) {
      setError(errorMessage(err, "Yenilənmədi"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={group != null}
      title="Qrupu redaktə et"
      onClose={onClose}
      busy={busy}
      footer={<Button title="Yadda saxla" icon="checkmark" loading={busy} onPress={() => void submit()} style={{ flex: 1 }} />}
    >
      <TextField label="Ad" value={name} onChangeText={setName} />
      <SegmentedField label="Tutum" value={slots} options={CAPACITY_OPTIONS} onChange={setSlots} />
      {error ? <View style={{ marginTop: spacing.sm }}><InfoBox tone="red">{error}</InfoBox></View> : null}
    </BottomSheet>
  );
}

export function AddToGroupSheet({
  group,
  options,
  onClose,
  onSubmit,
}: {
  group: ChampionshipGroup | null;
  options: Array<{ label: string; value: number }>;
  onClose: () => void;
  onSubmit: (group: ChampionshipGroup, teamId: number) => Promise<void>;
}) {
  const [teamId, setTeamId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTeamId(null);
    setError(null);
  }, [group]);

  return (
    <BottomSheet
      visible={group != null}
      title={group ? `${group.name} — komanda əlavə et` : ""}
      onClose={onClose}
      busy={busy}
      footer={
        <Button
          title="Əlavə et"
          icon="add"
          loading={busy}
          disabled={!teamId}
          style={{ flex: 1 }}
          onPress={async () => {
            if (!group || !teamId) return;
            setBusy(true);
            try {
              await onSubmit(group, teamId);
            } catch (err) {
              setError(errorMessage(err, "Əlavə edilmədi"));
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      {options.length === 0 ? (
        <Muted>Bütün komandalar qruplara təyin edilib.</Muted>
      ) : (
        <SelectField label="Komanda" value={teamId} options={options} onChange={setTeamId} />
      )}
      {error ? <View style={{ marginTop: spacing.sm }}><InfoBox tone="red">{error}</InfoBox></View> : null}
    </BottomSheet>
  );
}

/**
 * The backend answers start-playoff with code PLAYOFF_TIE when qualified teams
 * are level on every tiebreaker; the admin orders them manually.
 */
export function TieBreakSheet({
  groups,
  busy,
  onClose,
  onSubmit,
}: {
  groups: PlayoffTieGroup[] | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (orderedTeamIds: number[]) => void;
}) {
  const styles = useStyles();
  const [orders, setOrders] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (groups) setOrders(Object.fromEntries(groups.map((g) => [g.id, g.teams.map((t) => t.teamId)])));
  }, [groups]);

  const move = (groupId: string, index: number, dir: -1 | 1) => {
    setOrders((prev) => {
      const list = [...(prev[groupId] ?? [])];
      const next = index + dir;
      if (next < 0 || next >= list.length) return prev;
      [list[index], list[next]] = [list[next], list[index]];
      return { ...prev, [groupId]: list };
    });
  };

  return (
    <BottomSheet
      visible={groups != null}
      title="Playoff bərabərliyi"
      onClose={onClose}
      busy={busy}
      footer={
        <Button
          title="Sıralamanı təsdiq et"
          icon="play"
          loading={busy}
          style={{ flex: 1 }}
          onPress={() => groups && onSubmit(groups.flatMap((g) => orders[g.id] ?? g.teams.map((t) => t.teamId)))}
        />
      }
    >
      <Muted style={{ marginBottom: spacing.md }}>Bu komandalar bütün göstəricilərdə bərabərdir. Sıralamanı özünüz təyin edin.</Muted>
      {(groups ?? []).map((g) => (
        <View key={g.id} style={{ marginBottom: spacing.lg }}>
          <Text style={styles.groupTitle}>{g.title}</Text>
          {(orders[g.id] ?? []).map((teamId, index, list) => {
            const team = g.teams.find((t) => t.teamId === teamId);
            return (
              <Row key={teamId} style={styles.tieRow}>
                <Text style={styles.tiePos}>{index + 1}</Text>
                <Text style={styles.tieName}>{team?.name ?? teamId}</Text>
                <Button title="" icon="chevron-up" size="sm" variant="soft" disabled={index === 0} onPress={() => move(g.id, index, -1)} accessibilityLabel="Yuxarı" />
                <Button title="" icon="chevron-down" size="sm" variant="soft" disabled={index === list.length - 1} onPress={() => move(g.id, index, 1)} accessibilityLabel="Aşağı" />
              </Row>
            );
          })}
        </View>
      ))}
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) => ({
  summary: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.md, marginBottom: spacing.sm },
  summaryWarn: { backgroundColor: c.amberSoft },
  summaryOk: { backgroundColor: c.brandSoft },
  hint: { flex: 1, fontFamily: ff.semibold, fontSize: 12.5 },
  groupTitle: { fontSize: font.md, fontFamily: ff.bold, color: c.ink, marginBottom: spacing.sm },
  tieRow: { minHeight: 52, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: c.cardMuted, marginBottom: 6 },
  tiePos: { width: 24, fontFamily: ff.displayBold, fontSize: 17, color: c.brandInk },
  tieName: { flex: 1, fontFamily: ff.bold, color: c.ink },
}));
