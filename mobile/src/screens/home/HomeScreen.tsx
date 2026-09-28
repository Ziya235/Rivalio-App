import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ScrollScreen } from "../../components/Screen";
import { Eyebrow, IconTile, Title, type IconName } from "../../components/ui";
import { useCurrentUser } from "../../context/AuthContext";
import { useMyTeams } from "../../hooks/useMyTeams";
import type { FootballSection } from "../../navigation/types";
import { cardShadow, display, ff, radius, spacing, type Tone } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import { SectionHead, SportCard, StepsCard } from "../guest/blocks";
import { SPORTS } from "../guest/content";

type QuickLink = { icon: IconName; label: string; tone: Tone; section: FootballSection };

const QUICK_LINKS: QuickLink[] = [
  { icon: "shield-outline", label: "Komandam", tone: "lime", section: "teams" },
  { icon: "flash-outline", label: "Oyun təklifləri", tone: "orange", section: "challenges" },
  { icon: "person-add-outline", label: "Oyunçu axtarışı", tone: "violet", section: "players" },
  { icon: "trophy-outline", label: "Liqalar", tone: "blue", section: "leagues" },
  { icon: "medal-outline", label: "Çempionatlar", tone: "lime", section: "championships" },
];

/** Signed-in home: greeting with personal stats, shortcuts into the football hub, sports. */
export function HomeScreen() {
  const navigation = useNavigation();
  const user = useCurrentUser();
  const { teams, captainTeams } = useMyTeams();
  const { c } = useTheme();
  const styles = useStyles();

  return (
    <ScrollScreen contentStyle={{ paddingTop: spacing.xs }}>
      <View style={styles.hero}>
        <LinearGradient colors={[c.brandSoft, "transparent"]} start={{ x: 1, y: 0 }} end={{ x: 0.1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Eyebrow>Xoş gəldin</Eyebrow>
        <Title size={40} style={{ marginTop: 6 }}>
          Salam, <Text style={{ color: c.brandInk }}>{user.firstName}</Text>
        </Title>
        <Text style={styles.heroText}>Rəqibini tap, komandanı qur, oyuna qoşul.</Text>
        <View style={styles.heroStats}>
          <HeroStat value={teams.length} label="Komanda" />
          <HeroStat value={captainTeams.length} label="Kapitan" />
          <HeroStat value={user.gamesPlayed} label="Oyun" />
          <HeroStat value={user.goals} label="Qol" accent />
        </View>
      </View>

      <SectionHead title="Sürətli keçid" />
      <View style={styles.quickGrid}>
        {QUICK_LINKS.map((link) => (
          <Pressable
            key={link.label}
            onPress={() => navigation.navigate("Football", { section: link.section })}
            accessibilityRole="button"
            accessibilityLabel={link.label}
            style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85 }]}
          >
            <IconTile icon={link.icon} tone={link.tone} size={36} />
            <Text style={styles.quickLabel} numberOfLines={2}>
              {link.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionHead eyebrow="İdmanlar" title="İdman növünü seç" />
      <View style={{ gap: spacing.md }}>
        {SPORTS.slice(0, 2).map((sport) => (
          <SportCard key={sport.id} sport={sport} onPress={() => navigation.navigate("Football")} />
        ))}
        <Pressable onPress={() => navigation.navigate("UserTabs", { screen: "Sports" })} accessibilityRole="link" style={styles.more}>
          <Text style={styles.moreText}>Bütün idman növləri</Text>
          <Ionicons name="arrow-forward" size={15} color={c.brandInk} />
        </Pressable>
      </View>

      <SectionHead eyebrow="Necə işləyir?" title="4 addımda meydançaya" />
      <StepsCard />

      <View style={styles.links}>
        <Pressable onPress={() => navigation.navigate("About")} accessibilityRole="link" style={styles.linkRow}>
          <Ionicons name="people-outline" size={18} color={c.textMuted} />
          <Text style={styles.linkText}>Haqqımızda</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Faq")} accessibilityRole="link" style={[styles.linkRow, styles.linkBorder]}>
          <Ionicons name="help-circle-outline" size={18} color={c.textMuted} />
          <Text style={styles.linkText}>Tez-tez verilən suallar</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
        </Pressable>
      </View>
    </ScrollScreen>
  );
}

function HeroStat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.heroStat}>
      <Text style={[styles.heroStatValue, accent && styles.heroStatAccent]}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg + 2,
    borderWidth: 1,
    borderColor: c.brandBorder,
    backgroundColor: c.card,
    overflow: "hidden",
    ...cardShadow(c),
  },
  heroText: { fontFamily: ff.regular, fontSize: 13.5, color: c.textMuted, marginTop: 8 },
  heroStats: { flexDirection: "row", marginTop: spacing.lg, gap: 8 },
  heroStat: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: c.cardMuted },
  heroStatValue: { ...display(24), lineHeight: 26, color: c.ink },
  heroStatAccent: { color: c.brandInk },
  heroStatLabel: { fontFamily: ff.medium, fontSize: 11, color: c.textMuted },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quick: {
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 96,
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 10,
    ...cardShadow(c),
  },
  quickLabel: { fontSize: 13, fontFamily: ff.bold, color: c.ink },
  more: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44 },
  moreText: { fontFamily: ff.semibold, fontSize: 13.5, color: c.brandInk },
  links: { marginTop: spacing.xl, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
  linkBorder: { borderTopWidth: 1, borderTopColor: c.border },
  linkText: { flex: 1, fontFamily: ff.semibold, fontSize: 14, color: c.ink },
}));
