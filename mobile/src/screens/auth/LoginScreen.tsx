import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../../api/errors";
import { Screen } from "../../components/Screen";
import { TopBar } from "../../components/TopBar";
import { Button, Logo, TextField, Title } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import type { RootScreenProps } from "../../navigation/types";
import { display, ff, font, radius, spacing } from "../../theme";
import { makeStyles, ThemeOverride, useTheme } from "../../theme/ThemeContext";

/** Faint football pitch lines behind the auth screens. */
export function PitchBackdrop() {
  const styles = useStyles();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["rgba(197,241,53,0.18)", "transparent"]} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.45 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["transparent", "rgba(124,58,237,0.22)"]} start={{ x: 0.7, y: 0.4 }} end={{ x: 0, y: 0.8 }} style={StyleSheet.absoluteFill} />
      <View style={styles.pitch}>
        <View style={styles.pitchHalf} />
        <View style={styles.pitchCircle} />
        <View style={[styles.pitchBox, { top: -1 }]} />
        <View style={[styles.pitchBox, { bottom: -1 }]} />
      </View>
    </View>
  );
}

export function LoginScreen(props: RootScreenProps<"Login">) {
  return (
    <ThemeOverride mode="dark">
      <LoginContent {...props} />
    </ThemeOverride>
  );
}

function LoginContent({ navigation }: RootScreenProps<"Login">) {
  const { login, sessionExpired } = useAuth();
  const { c } = useTheme();
  const styles = useStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Email və şifrə mütləqdir");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err, "Giriş alınmadı"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <StatusBar style="light" />
      <PitchBackdrop />
      <TopBar back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 18 }}>
            <Logo size={24} />
            <Title size={46}>
              Oyunun sənin{"\n"}
              <Text style={{ color: c.brand }}>üçün başlasın</Text>
            </Title>
            <Text style={styles.lead}>Rivalio-ya qoşul. Oyunçu tap, komanda qur, rəqib axtar.</Text>
          </View>
          <View style={styles.card}>
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.cardTitle} accessibilityRole="header">
                Xoş gəldiniz!
              </Text>
              <Text style={styles.cardSub}>Hesabınıza daxil olun</Text>
            </View>
            {sessionExpired ? <Text style={styles.notice}>Sessiyanın vaxtı bitib. Yenidən daxil olun.</Text> : null}
            <TextField
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="ad@nümunə.az"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <View>
              <TextField
                ref={passwordRef}
                label="Şifrə"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                style={{ paddingRight: 36 }}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eye}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
                hitSlop={8}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={c.textMuted} />
              </Pressable>
            </View>
            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <Button title="Daxil ol" iconRight="arrow-forward" onPress={() => void submit()} loading={loading} size="lg" fullWidth />
            <Pressable onPress={() => navigation.navigate("Register")} style={styles.link} accessibilityRole="link">
              <Text style={styles.linkText}>
                Hesabınız yoxdur? <Text style={styles.linkStrong}>Qeydiyyatdan keç</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  content: { flexGrow: 1, justifyContent: "space-between", gap: spacing.xxl, padding: spacing.lg, paddingTop: spacing.sm },
  lead: { fontFamily: ff.regular, fontSize: 14.5, lineHeight: 21, color: c.textMuted },
  card: {
    backgroundColor: "rgba(16,16,23,0.9)",
    borderRadius: radius.xl,
    padding: spacing.lg + 2,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardTitle: { ...display(26), color: c.ink },
  cardSub: { fontFamily: ff.regular, fontSize: font.sm, color: c.textMuted, marginTop: 4 },
  notice: {
    backgroundColor: c.amberSoft,
    color: c.amber,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    fontFamily: ff.semibold,
  },
  eye: { position: "absolute", right: 14, top: 36, height: 28, justifyContent: "center" },
  error: { color: c.red, fontFamily: ff.semibold, marginBottom: spacing.md },
  link: { alignItems: "center", marginTop: spacing.md, minHeight: 44, justifyContent: "center" },
  linkText: { color: c.textMuted, fontSize: font.sm, fontFamily: ff.regular },
  linkStrong: { color: c.brandInk, fontFamily: ff.bold },
  pitch: {
    position: "absolute",
    top: 90,
    bottom: 40,
    left: 18,
    right: 18,
    borderWidth: 1.5,
    borderColor: "rgba(197,241,53,0.07)",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pitchHalf: { position: "absolute", left: 0, right: 0, top: "50%", height: 1.5, backgroundColor: "rgba(197,241,53,0.07)" },
  pitchCircle: { width: 108, height: 108, borderRadius: 54, borderWidth: 1.5, borderColor: "rgba(197,241,53,0.07)" },
  pitchBox: { position: "absolute", width: "52%", height: 92, borderWidth: 1.5, borderColor: "rgba(197,241,53,0.07)" },
}));
