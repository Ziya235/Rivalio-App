import { useEffect, useState } from "react";
import { View } from "react-native";
import { errorMessage } from "../../api/errors";
import { challengesApi, playerSearchApi } from "../../api/social";
import { teamsApi } from "../../api/teams";
import { uploadImage, type PickedImage } from "../../api/upload";
import { BottomSheet } from "../../components/BottomSheet";
import { DateTimeField, ImageField, SelectField } from "../../components/fields";
import { Button, InfoBox, TextField } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import type { TeamSummary } from "../../types/team";
import { defaultKickoff, isTooSoon, MIN_LEAD_MS, TOO_SOON_MSG } from "../../utils/matchClock";

type SheetProps = { visible: boolean; onClose: () => void; onDone: () => void };

function ErrorLine({ text }: { text: string | null }) {
  return text ? (
    <View style={{ marginBottom: 12 }}>
      <InfoBox tone="red">{text}</InfoBox>
    </View>
  ) : null;
}

export function CreateTeamSheet({ visible, onClose, onDone }: SheetProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName("");
    setCity("");
    setShortName("");
    setDescription("");
    setLogo(null);
    setError(null);
  }, [visible]);

  const submit = async () => {
    if (!name.trim()) {
      setError("Komanda adı mütləqdir");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const logoUrl = logo ? await uploadImage(logo) : undefined;
      await teamsApi.create({
        name: name.trim(),
        city: city.trim() || undefined,
        shortName: shortName.trim() || undefined,
        description: description.trim() || undefined,
        logo: logoUrl,
      });
      toast.success("Komanda yaradıldı");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Komanda yarat"
      onClose={onClose}
      busy={busy}
      footer={<Button title="Yarat" icon="add" onPress={() => void submit()} loading={busy} fullWidth style={{ flex: 1 }} />}
    >
      <TextField label="Komanda adı *" value={name} onChangeText={setName} maxLength={60} />
      <TextField label="Qısa ad" value={shortName} onChangeText={setShortName} maxLength={6} autoCapitalize="characters" />
      <TextField label="Şəhər" value={city} onChangeText={setCity} />
      <TextField label="Təsvir" value={description} onChangeText={setDescription} multiline maxLength={300} />
      <ImageField label="Loqo" value={logo} onChange={setLogo} />
      <ErrorLine text={error} />
    </BottomSheet>
  );
}

function teamOptions(teams: TeamSummary[]) {
  return teams.map((t) => ({ label: t.name, value: t.id }));
}

export function CreateChallengeSheet({ visible, onClose, onDone, captainTeams }: SheetProps & { captainTeams: TeamSummary[] }) {
  const toast = useToast();
  const [teamId, setTeamId] = useState<number | null>(null);
  const [when, setWhen] = useState<Date>(defaultKickoff());
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTeamId(captainTeams[0]?.id ?? null);
    setWhen(defaultKickoff());
    setVenue("");
    setNotes("");
    setError(null);
  }, [visible, captainTeams]);

  const submit = async () => {
    if (!teamId) return setError("Komanda seçin");
    if (!venue.trim()) return setError("Məkan mütləqdir");
    if (isTooSoon(when)) return setError(TOO_SOON_MSG);
    setBusy(true);
    setError(null);
    try {
      await challengesApi.create({ teamId, scheduledAt: when.toISOString(), venue: venue.trim(), notes: notes.trim() || undefined });
      toast.success("Oyun təklifi yaradıldı");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Oyun təklifi yarat"
      onClose={onClose}
      busy={busy}
      footer={<Button title="Yarat" icon="add" onPress={() => void submit()} loading={busy} style={{ flex: 1 }} />}
    >
      <SelectField label="Komanda" value={teamId} options={teamOptions(captainTeams)} onChange={setTeamId} />
      <DateTimeField label="Tarix və vaxt" value={when} onChange={setWhen} minimumDate={new Date(Date.now() + MIN_LEAD_MS)} />
      <TextField label="Məkan *" value={venue} onChangeText={setVenue} placeholder="Stadion və ya meydança" />
      <TextField label="Qeyd" value={notes} onChangeText={setNotes} multiline maxLength={300} />
      <ErrorLine text={error} />
    </BottomSheet>
  );
}

export function CreatePlayerSearchSheet({
  visible,
  onClose,
  onDone,
  captainTeams,
}: SheetProps & { captainTeams: TeamSummary[] }) {
  const toast = useToast();
  const [teamId, setTeamId] = useState<number | null>(null);
  const [when, setWhen] = useState<Date>(defaultKickoff());
  const [venue, setVenue] = useState("");
  const [needed, setNeeded] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTeamId(captainTeams[0]?.id ?? null);
    setWhen(defaultKickoff());
    setVenue("");
    setNeeded("1");
    setNotes("");
    setError(null);
  }, [visible, captainTeams]);

  const submit = async () => {
    const count = Number(needed);
    if (!teamId) return setError("Öz komandanızı seçin");
    if (!venue.trim()) return setError("Məkan mütləqdir");
    if (!Number.isInteger(count) || count < 1 || count > 20) return setError("Oyunçu sayı 1–20 arası olmalıdır");
    if (isTooSoon(when)) return setError(TOO_SOON_MSG);
    setBusy(true);
    setError(null);
    try {
      await playerSearchApi.create({
        hostTeamId: teamId,
        scheduledAt: when.toISOString(),
        venue: venue.trim(),
        notes: notes.trim() || undefined,
        playersNeeded: count,
      });
      toast.success("Oyunçu axtarışı yaradıldı");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Oyunçu axtarışı yarat"
      onClose={onClose}
      busy={busy}
      footer={<Button title="Yarat" icon="add" onPress={() => void submit()} loading={busy} style={{ flex: 1 }} />}
    >
      <SelectField label="Komanda" value={teamId} options={teamOptions(captainTeams)} onChange={setTeamId} />
      <DateTimeField label="Tarix və vaxt" value={when} onChange={setWhen} minimumDate={new Date(Date.now() + MIN_LEAD_MS)} />
      <TextField label="Məkan *" value={venue} onChangeText={setVenue} />
      <TextField
        label="Lazım olan oyunçu sayı"
        value={needed}
        onChangeText={(v) => setNeeded(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        maxLength={2}
        hint="1–20"
      />
      <TextField label="Qeyd" value={notes} onChangeText={setNotes} multiline maxLength={300} />
      <ErrorLine text={error} />
    </BottomSheet>
  );
}
