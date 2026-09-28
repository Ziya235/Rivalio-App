import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { errorMessage } from "../../api/errors";
import { BottomSheet } from "../../components/BottomSheet";
import { DateTimeField } from "../../components/fields";
import { Button, InfoBox, TeamCrest, TextField } from "../../components/ui";
import { ff, radius, spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import type { Match } from "../../types/match";
import { defaultKickoff, isTooSoon, MIN_LEAD_MS } from "../../utils/matchClock";

/** Set kickoff time + venue for a fixture (a match can only start once both are set). */
export function ScheduleSheet({
  match,
  onClose,
  onSave,
}: {
  match: Match | null;
  onClose: () => void;
  onSave: (match: Match, payload: { scheduledAt: string; venue: string }) => Promise<void>;
}) {
  const styles = useStyles();
  const [when, setWhen] = useState<Date | null>(null);
  const [venue, setVenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!match) return;
    setWhen(match.scheduledAt ? new Date(match.scheduledAt) : defaultKickoff());
    setVenue(match.venue ?? "");
    setError(null);
  }, [match]);

  const submit = async () => {
    if (!match) return;
    if (!when) return setError("Oyun vaxtı mütləqdir");
    if (!venue.trim()) return setError("Məkan mütləqdir");
    if (isTooSoon(when)) return setError("Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.");
    setBusy(true);
    setError(null);
    try {
      await onSave(match, { scheduledAt: when.toISOString(), venue: venue.trim() });
    } catch (err) {
      setError(errorMessage(err, "Yenilənmədi"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={match != null}
      title="Oyun vaxtı və məkan"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button title="Ləğv et" variant="soft" onPress={onClose} disabled={busy} />
          <Button title="Yadda saxla" loading={busy} onPress={() => void submit()} style={{ flex: 1 }} />
        </>
      }
    >
      {match ? (
        <View style={styles.pair}>
          <TeamCrest name={match.homeTeam.name} logo={match.homeTeam.logo} size={26} />
          <Text style={styles.team} numberOfLines={1}>
            {match.homeTeam.name}
          </Text>
          <Text style={styles.vs}>vs</Text>
          <Text style={[styles.team, { textAlign: "right" }]} numberOfLines={1}>
            {match.awayTeam.name}
          </Text>
          <TeamCrest name={match.awayTeam.name} logo={match.awayTeam.logo} size={26} />
        </View>
      ) : null}
      <DateTimeField label="Oyun vaxtı *" value={when} onChange={setWhen} minimumDate={new Date(Date.now() + MIN_LEAD_MS)} />
      <TextField label="Stadion / məkan" required icon="location-outline" value={venue} onChangeText={setVenue} placeholder="Tofiq Bəhramov stadionu" />
      {error ? <InfoBox tone="red">{error}</InfoBox> : <Text style={styles.hint}>Oyun vaxtı keçmişdə ola bilməz. Ən azı 1 saat sonra seçin.</Text>}
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) => ({
  pair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: c.cardMuted,
    marginBottom: spacing.lg,
  },
  team: { flex: 1, fontFamily: ff.bold, fontSize: 13, color: c.ink },
  vs: { fontFamily: ff.medium, fontSize: 11, color: c.textFaint },
  hint: { fontFamily: ff.regular, fontSize: 11.5, color: c.textFaint },
}));
