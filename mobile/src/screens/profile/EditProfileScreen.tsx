import { useState } from "react";
import { View } from "react-native";
import { errorMessage } from "../../api/errors";
import { DateTimeField } from "../../components/fields";
import { ScrollScreen } from "../../components/Screen";
import { Button, InfoBox, TextField } from "../../components/ui";
import { useAuth, useCurrentUser } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { RootScreenProps } from "../../navigation/types";
import { spacing } from "../../theme";
import { toDateOnly } from "../../utils/format";

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;

export function EditProfileScreen({ navigation }: RootScreenProps<"EditProfile">) {
  const user = useCurrentUser();
  const { updateProfile } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState(user.username);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [dob, setDob] = useState<Date | null>(user.dateOfBirth ? new Date(user.dateOfBirth) : null);
  const [bio, setBio] = useState(user.bio ?? "");
  const [workplace, setWorkplace] = useState(user.workplace ?? "");
  const [school, setSchool] = useState(user.school ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!USERNAME_REGEX.test(username)) return setError("İstifadəçi adı 3–30 simvol: kiçik hərf, rəqəm, nöqtə, alt xətt");
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !dob) return setError("Vacib sahələri doldurun");
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        username,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        dateOfBirth: toDateOnly(dob),
        bio: bio.trim(),
        workplace: workplace.trim(),
        school: school.trim(),
      });
      toast.success("Profil yeniləndi");
      navigation.goBack();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollScreen keyboard>
      <TextField label="İstifadəçi adı" icon="at" value={username} onChangeText={(v) => setUsername(v.replace(/\s/g, "").toLowerCase())} autoCapitalize="none" autoCorrect={false} />
      <TextField label="Ad" value={firstName} onChangeText={setFirstName} />
      <TextField label="Soyad" value={lastName} onChangeText={setLastName} />
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <DateTimeField label="Doğum tarixi" mode="date" value={dob} onChange={setDob} maximumDate={new Date()} />
      <TextField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={300} />
      <TextField label="İş yeri" value={workplace} onChangeText={setWorkplace} />
      <TextField label="Oxuduğunuz yer" value={school} onChangeText={setSchool} />
      {error ? (
        <View style={{ marginBottom: spacing.md }}>
          <InfoBox tone="red">{error}</InfoBox>
        </View>
      ) : null}
      <Button title="Yadda saxla" icon="checkmark" loading={saving} onPress={() => void save()} size="lg" />
    </ScrollScreen>
  );
}
