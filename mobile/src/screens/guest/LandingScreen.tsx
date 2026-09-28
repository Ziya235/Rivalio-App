import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollScreen } from "../../components/Screen";
import { GuestMenuButton, ThemeToggleButton, TopBar } from "../../components/TopBar";
import { Button, Title } from "../../components/ui";
import type { RootScreenProps } from "../../navigation/types";
import { display, ff, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import { CtaCard, FaqAccordion, FeatureGrid, Footer, SectionHead, StatsGrid, StepsCard } from "./blocks";
import { FAQS, SPORTS, TESTIMONIALS } from "./content";

/** Public landing page (web "/"): hero, sports, features, steps, stats, FAQ, CTA. */
export function LandingScreen({ navigation }: RootScreenProps<"Landing">) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <ScrollScreen
      header={
        <TopBar
          logo
          right={
            <>
              <ThemeToggleButton />
              <GuestMenuButton current="Landing" />
            </>
          }
        />
      }
      contentStyle={{ paddingTop: spacing.sm }}
    >
      <LinearGradient colors={[c.brandSoft, "transparent"]} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.8 }} style={styles.glow} />
      <View style={styles.pill}>
        <View style={styles.pillDot} />
        <Text style={styles.pillText}>2,500+ aktiv oyunçu</Text>
      </View>
      <Title size={48} style={styles.hero}>
        Rəqibini tap.{"\n"}Komandanı qur.{"\n"}
        <Text style={{ color: c.brandInk }}>Oyuna qoşul.</Text>
      </Title>
      <Text style={styles.lead}>
        Yaxınlığındakı oyunçuları, komandaları və idman partnyorlarını tap. Öz komandanı yarat, oyun təşkil et və yerli yarışlara qoşul.
      </Text>
      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Button title="İndi Başla" iconRight="arrow-forward" size="lg" onPress={() => navigation.navigate("Register")} fullWidth />
        <Button title="İdmanları Kəşf Et" variant="outline" size="lg" onPress={() => navigation.navigate("GuestSports")} fullWidth />
      </View>
      <Text style={styles.supported}>
        Dəstəklənən idmanlar: <Text style={{ fontSize: 16, letterSpacing: 3 }}>⚽🏀🎾🏓🏐</Text>
      </Text>

      <SectionHead eyebrow="İdmanlar" title="İdman növünü seç" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hs} style={styles.hsWrap}>
        {SPORTS.map((sport) => (
          <View key={sport.id} style={[styles.miniSport, sport.available && styles.miniSportLive]}>
            <Text style={{ fontSize: 26 }}>{sport.emoji}</Text>
            <Text style={styles.miniName}>{sport.name}</Text>
            <Text style={[styles.miniMeta, sport.available && { color: c.brandInk }]}>{sport.available ? "Aktiv" : "Tezliklə"}</Text>
          </View>
        ))}
      </ScrollView>

      <SectionHead eyebrow="İmkanlar" title="Oyun üçün lazım olan hər şey" />
      <FeatureGrid />

      <SectionHead eyebrow="Necə işləyir?" title="4 addımda meydançaya" />
      <StepsCard />

      <View style={{ marginTop: spacing.lg }}>
        <StatsGrid />
      </View>

      <SectionHead eyebrow="İcma" title="Oyunçular nə deyir" />
      <View style={{ gap: spacing.sm }}>
        {TESTIMONIALS.map((t) => (
          <View key={t.name} style={styles.quote}>
            <Text style={styles.quoteText}>“{t.text}”</Text>
            <Text style={styles.quoteName}>
              {t.name} <Text style={styles.quoteMeta}>· {t.meta}</Text>
            </Text>
          </View>
        ))}
      </View>

      <SectionHead eyebrow="Dəstək" title="Tez-tez verilən suallar" />
      <FaqAccordion items={FAQS.slice(0, 5)} />

      <CtaCard
        title="Növbəti oyunun səni gözləyir"
        text="Rivalio-ya qoşul, komandanı yarat və öz rəqibini tap."
        primary={{ label: "Qeydiyyatdan keç", onPress: () => navigation.navigate("Register") }}
        secondary={{ label: "Daxil ol", onPress: () => navigation.navigate("Login") }}
      />
      <Footer />
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  glow: { position: "absolute", top: -40, right: -80, width: 320, height: 320, borderRadius: 160, opacity: 0.9 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: c.brandSoft,
    marginTop: spacing.sm,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.brand },
  pillText: { fontFamily: ff.bold, fontSize: 11.5, color: c.brandInk },
  hero: { marginTop: spacing.lg, lineHeight: 46 },
  lead: { fontFamily: ff.regular, fontSize: 15, lineHeight: 23, color: c.textMuted, marginTop: spacing.md },
  supported: { fontFamily: ff.regular, fontSize: 13, color: c.textMuted, marginTop: spacing.lg },
  hsWrap: { marginHorizontal: -spacing.lg },
  hs: { gap: 10, paddingHorizontal: spacing.lg },
  miniSport: {
    width: 118,
    gap: 6,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  miniSportLive: { borderColor: c.brandBorder },
  miniName: { fontFamily: ff.bold, fontSize: 13.5, color: c.ink },
  miniMeta: { fontFamily: ff.medium, fontSize: 11.5, color: c.textFaint },
  quote: { gap: 8, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
  quoteText: { fontFamily: ff.regular, fontSize: 13.5, lineHeight: 20, color: c.text },
  quoteName: { ...display(15, "bold"), textTransform: "none", color: c.ink },
  quoteMeta: { fontFamily: ff.regular, fontSize: 12, color: c.textFaint },
}));
