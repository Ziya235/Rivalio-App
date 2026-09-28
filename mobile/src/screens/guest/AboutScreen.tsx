import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScrollScreen } from "../../components/Screen";
import { GuestMenuButton, ThemeToggleButton, TopBar } from "../../components/TopBar";
import { Eyebrow, IconTile, Title } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { cardShadow, display, ff, radius, spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import { CtaCard, SectionHead, StatsGrid, StepsCard } from "./blocks";
import { ABOUT, HOW_STEPS, VALUES } from "./content";

/** Web /about-us. */
export function AboutScreen() {
  const navigation = useNavigation();
  const { status } = useAuth();
  const styles = useStyles();
  const guest = status === "guest";
  return (
    <ScrollScreen
      header={
        guest ? (
          <TopBar
            logo
            right={
              <>
                <ThemeToggleButton />
                <GuestMenuButton current="About" />
              </>
            }
          />
        ) : undefined
      }
    >
      <Eyebrow>Haqqımızda</Eyebrow>
      <Title size={34} style={{ marginTop: 8 }}>
        Oyunçu, komanda və rəqib tapmaq üçün sosial idman platforması
      </Title>
      <Text style={styles.lead}>{ABOUT.lead}</Text>

      <View style={[styles.card, { marginTop: spacing.xl }]}>
        <Text style={styles.cardTitle}>Missiyamız</Text>
        <Text style={styles.body}>{ABOUT.mission}</Text>
      </View>
      <View style={[styles.card, { marginTop: spacing.md }]}>
        <Text style={styles.cardTitle}>Nə təklif edirik</Text>
        <Text style={styles.body}>{ABOUT.offer}</Text>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <StatsGrid />
      </View>

      <SectionHead title="Necə işləyir" />
      <StepsCard steps={HOW_STEPS} />

      <SectionHead title="Dəyərlərimiz" />
      <View style={styles.grid}>
        {VALUES.map((v) => (
          <View key={v.title} style={styles.value}>
            <IconTile icon={v.icon} tone={v.tone} size={38} />
            <Text style={styles.valueTitle}>{v.title}</Text>
            <Text style={styles.valueDesc}>{v.desc}</Text>
          </View>
        ))}
      </View>

      <CtaCard
        title="Növbəti oyunun səni gözləyir"
        text="Rivalio-ya qoşul, komandanı yarat və öz rəqibini tap."
        primary={
          guest
            ? { label: "Qeydiyyatdan keç", onPress: () => navigation.navigate("Register") }
            : { label: "Profilə keç", onPress: () => navigation.navigate("UserTabs", { screen: "Profile" }) }
        }
        secondary={{
          label: "İdmanları kəşf et",
          onPress: () => (guest ? navigation.navigate("GuestSports") : navigation.navigate("UserTabs", { screen: "Sports" })),
        }}
      />
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  lead: { fontFamily: ff.regular, fontSize: 14.5, lineHeight: 22, color: c.textMuted, marginTop: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, gap: 8, ...cardShadow(c) },
  cardTitle: { ...display(20, "bold"), color: c.ink },
  body: { fontFamily: ff.regular, fontSize: 13.5, lineHeight: 21, color: c.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  value: { flexBasis: "47%", flexGrow: 1, gap: 6, padding: 14, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, ...cardShadow(c) },
  valueTitle: { fontFamily: ff.bold, fontSize: 14, color: c.ink, marginTop: 4 },
  valueDesc: { fontFamily: ff.regular, fontSize: 12, lineHeight: 17, color: c.textMuted },
}));
