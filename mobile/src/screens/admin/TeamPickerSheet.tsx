import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { teamsApi } from "../../api/teams";
import { BottomSheet } from "../../components/BottomSheet";
import { Button, InfoBox, Muted, TeamCrest, TextField } from "../../components/ui";
import { useDebouncedValue } from "../../hooks/timers";
import { ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { TeamSummary } from "../../types/team";

/**
 * Search teams by name and pick one. `unavailable` returns a reason text for
 * teams that are already enrolled / invited (shown but not selectable).
 */
export function TeamPickerSheet({
  visible,
  title,
  submitLabel,
  withMessage,
  unavailable,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  submitLabel: string;
  withMessage?: boolean;
  unavailable: (team: TeamSummary) => string | null;
  onClose: () => void;
  onSubmit: (team: TeamSummary, message: string) => Promise<void>;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q.trim(), 250);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<TeamSummary | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQ("");
    setTeams([]);
    setPicked(null);
    setMessage("");
    setError(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || !debounced) {
      setTeams([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    teamsApi
      .list({ q: debounced }, controller.signal)
      .then(setTeams)
      .catch(() => undefined)
      .finally(() => !controller.signal.aborted && setSearching(false));
    return () => controller.abort();
  }, [debounced, visible]);

  const submit = async () => {
    if (!picked) {
      setError("Komanda seçin");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(picked, message.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={onClose}
      busy={busy}
      footer={<Button title={submitLabel} icon="send" loading={busy} disabled={!picked} onPress={() => void submit()} style={{ flex: 1 }} />}
    >
      <Muted style={{ marginBottom: spacing.md }}>Dəvət komandanın kapitanına gedəcək.</Muted>
      <TextField icon="search" value={q} onChangeText={(v) => { setQ(v); setPicked(null); }} placeholder="Komanda adını yazın..." autoFocus accessibilityLabel="Komanda axtar" />
      {searching ? <ActivityIndicator color={c.brand} /> : null}
      {!debounced ? <Muted>Hərf yazdıqca komandalar axtarılacaq</Muted> : !searching && teams.length === 0 ? <Muted>Nəticə tapılmadı</Muted> : null}
      <View style={teams.length > 0 ? styles.results : undefined}>
        {teams.map((team) => {
          const reason = unavailable(team);
          const selected = picked?.id === team.id;
          return (
            <Pressable
              key={team.id}
              disabled={reason != null}
              onPress={() => setPicked(team)}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: reason != null }}
              style={[styles.row, selected && styles.selected, reason != null && { opacity: 0.55 }]}
            >
              <TeamCrest name={team.name} logo={team.logo} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{team.name}</Text>
                <Muted>
                  {[team.city, team.captain ? `@${team.captain.username}` : null].filter(Boolean).join(" · ") || "—"}
                </Muted>
                {reason ? <Text style={styles.reason}>{reason}</Text> : null}
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={c.brandInk} /> : null}
            </Pressable>
          );
        })}
      </View>
      {withMessage ? (
        <View style={{ marginTop: spacing.md }}>
          <TextField label="Mesaj (istəyə bağlı)" value={message} onChangeText={setMessage} placeholder="Yarışımıza qoşulun..." />
        </View>
      ) : null}
      {error ? <View style={{ marginTop: spacing.sm }}><InfoBox tone="red">{error}</InfoBox></View> : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) => ({
  results: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, overflow: "hidden", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: 12, paddingVertical: 10, minHeight: 56, borderTopWidth: 1, borderTopColor: c.border, marginTop: -1 },
  selected: { backgroundColor: c.brandSoft },
  name: { fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  reason: { fontSize: font.xs, color: c.amber, fontFamily: ff.bold, marginTop: 2 },
}));
