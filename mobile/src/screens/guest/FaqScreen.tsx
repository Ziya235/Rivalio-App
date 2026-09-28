import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScrollScreen } from "../../components/Screen";
import { GuestMenuButton, ThemeToggleButton, TopBar } from "../../components/TopBar";
import { Button, Eyebrow, Title } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { cardShadow, ff, radius, spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import { FaqAccordion } from "./blocks";
import { FAQS } from "./content";

/** Web /faq. */
export function FaqScreen() {
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
                <GuestMenuButton current="Faq" />
              </>
            }
          />
        ) : undefined
      }
    >
      <Eyebrow>Dəstək</Eyebrow>
      <Title size={38} style={{ marginTop: 8 }}>
        Tez-tez verilən suallar
      </Title>
      <Text style={styles.lead}>Qeydiyyat, komandalar, liqalar və chat haqqında ən çox soruşulanlar.</Text>
      <View style={{ marginTop: spacing.lg }}>
        <FaqAccordion items={FAQS} initiallyOpen={null} />
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Cavabını tapmadın?</Text>
        <Text style={styles.ctaText}>Bizim haqqımızda oxu{guest ? " və ya hesab yaradıb başla." : "."}</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button title="Haqqımızda" variant="outline" size="sm" onPress={() => navigation.navigate("About")} style={{ flex: 1 }} />
          {guest ? <Button title="Qeydiyyatdan keç" size="sm" onPress={() => navigation.navigate("Register")} style={{ flex: 1 }} /> : null}
        </View>
      </View>
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  lead: { fontFamily: ff.regular, fontSize: 14, lineHeight: 21, color: c.textMuted, marginTop: spacing.sm },
  cta: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    gap: 10,
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  ctaTitle: { fontFamily: ff.bold, fontSize: 15, color: c.ink },
  ctaText: { fontFamily: ff.regular, fontSize: 13, color: c.textMuted, textAlign: "center" },
}));
