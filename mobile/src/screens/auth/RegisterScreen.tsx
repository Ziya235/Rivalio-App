import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../../api/errors";
import type { PickedImage } from "../../api/upload";
import { DateTimeField, pickImage } from "../../components/fields";
import { ScrollScreen } from "../../components/Screen";
import { TopBar } from "../../components/TopBar";
import { Button, Pill, Row, TextField, Title } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import type { RootScreenProps } from "../../navigation/types";
import { ff, font, spacing } from "../../theme";
import { makeStyles, ThemeOverride, useTheme } from "../../theme/ThemeContext";
import { toDateOnly } from "../../utils/format";
import { PitchBackdrop } from "./LoginScreen";

// Same rule as backend/controllers/authController.js
const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;

export function RegisterScreen(props: RootScreenProps<"Register">) {
  return (
    <ThemeOverride mode="dark">
      <RegisterContent {...props} />
    </ThemeOverride>
  );
}

function RegisterContent({ navigation }: RootScreenProps<"Register">) {
  const { register } = useAuth();
  const { c } = useTheme();
  const styles = useStyles();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [bio, setBio] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [school, setSchool] = useState("");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameValid = USERNAME_REGEX.test(username);
  const passwordsMatch = !confirmPass || password === confirmPass;
  const step1Valid =
    usernameValid &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 6 &&
    password === confirmPass &&
    dob != null;

  const finish = async () => {
    if (!step1Valid || !dob) return;
    setLoading(true);
    setError(null);
    try {
      await register(
        {
          username,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          dateOfBirth: toDateOnly(dob),
          bio: bio.trim() || undefined,
          workplace: workplace.trim() || undefined,
          school: school.trim() || undefined,
        },
        image,
      );
    } catch (err) {
      setError(errorMessage(err, "Qeydiyyat uğursuz oldu"));
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollScreen
      edges={["bottom", "left", "right"]}
      keyboard
      header={
        <>
          <StatusBar style="light" />
          <PitchBackdrop />
          <TopBar back right={<Text style={styles.stepText}>Addım {step} / 2</Text>} />
        </>
      }
      contentStyle={{ paddingTop: spacing.xs }}
    >
      <View style={styles.progress}>
        <View style={[styles.progressPart, styles.progressOn]} />
        <View style={[styles.progressPart, step === 2 && styles.progressOn]} />
      </View>

      {step === 1 ? (
        <>
          <Title size={30}>Əsas məlumatlar</Title>
          <Text style={styles.sub}>Hesabını yarat, sonra profili tamamla.</Text>
          <View style={styles.form}>
            <TextField
              label="İstifadəçi adı"
              required
              icon="at"
              value={username}
              onChangeText={(v) => setUsername(v.replace(/^@/, "").replace(/\s/g, "").toLowerCase())}
              placeholder="futbolcu_10"
              autoCapitalize="none"
              autoCorrect={false}
              error={username && !usernameValid ? "3–30 simvol: kiçik hərf, rəqəm, nöqtə, alt xətt" : null}
            />
            <Row gap={10} style={{ alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <TextField label="Ad" required value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Soyad" required value={lastName} onChangeText={setLastName} autoComplete="family-name" />
              </View>
            </Row>
            <TextField
              label="Email"
              required
              value={email}
              onChangeText={setEmail}
              placeholder="ad@nümunə.az"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextField
              label="Şifrə"
              required
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              hint="Minimum 6 simvol"
              error={password && password.length < 6 ? "Şifrə ən azı 6 simvol olmalıdır" : null}
            />
            <TextField
              label="Şifrəni təkrar et"
              required
              value={confirmPass}
              onChangeText={setConfirmPass}
              secureTextEntry
              error={!passwordsMatch ? "Şifrələr uyğun gəlmir" : null}
            />
            <DateTimeField label="Doğum tarixi *" mode="date" value={dob} onChange={setDob} maximumDate={new Date()} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="İrəli" iconRight="arrow-forward" onPress={() => setStep(2)} disabled={!step1Valid} size="lg" fullWidth />
          </View>
        </>
      ) : (
        <>
          <Row gap={10}>
            <Title size={30}>Profil</Title>
            <Pill label="istəyə bağlı" />
          </Row>
          <View style={styles.photoWrap}>
            <Pressable
              style={styles.photo}
              onPress={async () => {
                const picked = await pickImage();
                if (picked) setImage(picked);
              }}
              accessibilityRole="button"
              accessibilityLabel="Profil şəkli seç"
            >
              {image ? <Image source={{ uri: image.uri }} style={styles.photoImg} /> : <Ionicons name="camera-outline" size={28} color={c.brandInk} />}
            </Pressable>
            <Text style={styles.photoText}>{image ? "Şəkli dəyiş" : "Şəkil yüklə"}</Text>
          </View>
          <View style={styles.form}>
            <TextField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={300} placeholder="Mövqeyin, oyun tərzin..." />
            <TextField label="İş yeri" value={workplace} onChangeText={setWorkplace} placeholder="Harada işləyirsən?" />
            <TextField label="Oxuduğunuz yer" value={school} onChangeText={setSchool} placeholder="Universitet, məktəb" />
            <Text style={styles.note}>Bu məlumatları sonra profil səhifəsindən dəyişə bilərsən.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Row gap={spacing.sm}>
              <Button title="Geri" variant="soft" onPress={() => setStep(1)} />
              <Button title="Qeydiyyatı tamamla" onPress={() => void finish()} loading={loading} style={{ flex: 1 }} />
            </Row>
          </View>
        </>
      )}
      <Pressable onPress={() => navigation.navigate("Login")} style={styles.link} accessibilityRole="link">
        <Text style={styles.linkText}>
          Artıq hesabın var? <Text style={styles.linkStrong}>Daxil ol</Text>
        </Text>
      </Pressable>
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  stepText: { fontFamily: ff.medium, fontSize: font.sm, color: c.textMuted },
  progress: { flexDirection: "row", gap: 6, marginBottom: spacing.xl },
  progressPart: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.borderStrong },
  progressOn: { backgroundColor: c.brand },
  sub: { fontFamily: ff.regular, fontSize: font.sm, color: c.textMuted, marginTop: 6 },
  form: { marginTop: spacing.xl },
  error: { color: c.red, fontFamily: ff.semibold, marginBottom: spacing.md },
  note: {
    fontFamily: ff.regular,
    fontSize: 12.5,
    color: c.textMuted,
    backgroundColor: c.cardMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: spacing.md,
  },
  photoWrap: { alignItems: "center", gap: 10, marginTop: spacing.xl },
  photo: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: c.brandSoft,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: c.brandBorder,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: "100%", height: "100%" },
  photoText: { fontFamily: ff.semibold, fontSize: font.sm, color: c.brandInk },
  link: { alignItems: "center", marginTop: spacing.lg, minHeight: 44, justifyContent: "center" },
  linkText: { color: c.textMuted, fontSize: font.sm, fontFamily: ff.regular },
  linkStrong: { color: c.brandInk, fontFamily: ff.bold },
}));
