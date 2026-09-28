import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { confirm } from "../../components/fields";
import { ScrollScreen } from "../../components/Screen";
import { Avatar, Button, type IconName } from "../../components/ui";
import { useAuth, useCurrentUser } from "../../context/AuthContext";
import { cardShadow, ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import { fullName } from "../../utils/format";

const SOON = ["Tennis", "Stolüstü tennis", "Voleybol", "Basketbol"];

function MenuModule({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [styles.module, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={17} color={c.ink} />
      <Text style={styles.moduleText}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
    </Pressable>
  );
}

/** The web admin sidebar as a page: account, sports → modules, theme, help and logout. */
export function AdminMenuScreen() {
  const navigation = useNavigation();
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { c, mode, toggle } = useTheme();
  const styles = useStyles();

  return (
    <ScrollScreen contentStyle={{ paddingTop: spacing.xs }}>
      <Pressable onPress={() => navigation.navigate("AdminProfile")} accessibilityRole="button" accessibilityLabel="Hesab" style={styles.account}>
        <Avatar uri={user.image} name={fullName(user)} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName(user)}</Text>
          <Text style={styles.sub}>{user.email}</Text>
          <View style={styles.role}>
            <Text style={styles.roleText}>Admin</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
      </Pressable>

      <Text style={styles.heading}>İDMAN NÖVLƏRİ</Text>
      <View style={styles.card}>
        <View style={styles.sport}>
          <Text style={styles.sportText}>Futbol</Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </View>
        <View style={styles.modules}>
          <MenuModule icon="trophy-outline" label="Liqalar" onPress={() => navigation.navigate("AdminTabs", { screen: "AdminLeagues" })} />
          <MenuModule icon="medal-outline" label="Çempionatlar" onPress={() => navigation.navigate("AdminTabs", { screen: "AdminChampionships" })} />
        </View>
        {SOON.map((name) => (
          <View key={name} style={[styles.sport, styles.sportBorder]}>
            <Text style={[styles.sportText, styles.soon]}>{name}</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonText}>TEZLİKLƏ</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.heading}>TƏNZİMLƏMƏLƏR</Text>
      <View style={styles.card}>
        <Pressable onPress={toggle} accessibilityRole="switch" accessibilityState={{ checked: mode === "dark" }} style={styles.sport}>
          <Ionicons name="moon-outline" size={18} color={c.textMuted} />
          <Text style={[styles.sportText, { flex: 1 }]}>Qaranlıq tema</Text>
          <View style={[styles.switch, mode === "dark" && styles.switchOn]}>
            <View style={[styles.thumb, mode === "dark" && styles.thumbOn]} />
          </View>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("EditProfile")} accessibilityRole="link" style={[styles.sport, styles.sportBorder]}>
          <Ionicons name="create-outline" size={18} color={c.textMuted} />
          <Text style={[styles.sportText, { flex: 1 }]}>Profili redaktə et</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
        </Pressable>
      </View>

      <View style={styles.help}>
        <View style={styles.helpHead}>
          <Ionicons name="help-circle-outline" size={18} color={c.brandInk} />
          <Text style={styles.helpTitle}>Kömək lazımdır?</Text>
        </View>
        <Text style={styles.sub}>Liqa və komanda idarəçiliyi üçün bələdçi.</Text>
        <Button title="FAQ" variant="soft" size="sm" icon="book-outline" onPress={() => navigation.navigate("Faq")} fullWidth />
        <Button
          title="Çıxış"
          variant="danger"
          size="sm"
          icon="log-out-outline"
          fullWidth
          onPress={async () => {
            if (await confirm({ title: "Hesabdan çıxmaq istəyirsiniz?", confirmLabel: "Çıxış", destructive: true })) await logout();
          }}
        />
      </View>
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  name: { fontFamily: ff.bold, fontSize: 16, color: c.ink },
  sub: { fontFamily: ff.regular, fontSize: 12.5, color: c.textMuted, marginTop: 2 },
  role: { alignSelf: "flex-start", marginTop: 6, height: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: c.brandSoft, justifyContent: "center" },
  roleText: { fontFamily: ff.bold, fontSize: 10.5, color: c.brandInk },
  heading: { fontFamily: ff.bold, fontSize: 11, letterSpacing: 1.3, color: c.textFaint, marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: 4 },
  card: { borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, ...cardShadow(c) },
  sport: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50 },
  sportBorder: { borderTopWidth: 1, borderTopColor: c.border },
  sportText: { fontFamily: ff.semibold, fontSize: font.md - 0.5, color: c.ink, flex: 1 },
  modules: { marginLeft: 6, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: c.borderStrong, marginBottom: 10, gap: 2 },
  module: { flexDirection: "row", alignItems: "center", gap: 10, height: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.brandSoft },
  moduleText: { flex: 1, fontFamily: ff.semibold, fontSize: 14, color: c.ink },
  soon: { color: c.textFaint },
  soonBadge: { height: 20, paddingHorizontal: 7, borderRadius: 6, backgroundColor: c.cardMuted, justifyContent: "center" },
  soonText: { fontFamily: ff.bold, fontSize: 9.5, letterSpacing: 0.6, color: c.textFaint },
  switch: { width: 42, height: 24, borderRadius: 12, backgroundColor: c.cardMuted, justifyContent: "center" },
  switchOn: { backgroundColor: c.brand },
  thumb: { width: 18, height: 18, borderRadius: 9, marginLeft: 3, backgroundColor: c.textFaint },
  thumbOn: { marginLeft: 21, backgroundColor: c.onBrand },
  help: { marginTop: spacing.xl, padding: spacing.lg, gap: 10, borderRadius: radius.lg, backgroundColor: c.brandSoft },
  helpHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  helpTitle: { fontFamily: ff.bold, fontSize: 14, color: c.ink },
}));
