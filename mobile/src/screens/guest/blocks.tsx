import { memo, useState } from "react";
import { Image, LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, Eyebrow, IconTile, Logo, Title } from "../../components/ui";
import { cardShadow, display, ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import { FAQS, FEATURES, HOW_STEPS, STATS, type Sport } from "./content";

export function SectionHead({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <View style={{ gap: 6, marginTop: spacing.xxl, marginBottom: spacing.md }}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Title size={28}>{title}</Title>
    </View>
  );
}

export function FeatureGrid() {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {FEATURES.map((f) => (
        <View key={f.title} style={styles.feature}>
          <IconTile icon={f.icon} tone={f.tone} size={38} />
          <Text style={styles.featureTitle}>{f.title}</Text>
          <Text style={styles.featureDesc}>{f.desc}</Text>
        </View>
      ))}
    </View>
  );
}

/** Numbered steps: the order is the actual onboarding sequence. */
export function StepsCard({ steps = HOW_STEPS }: { steps?: Array<{ title: string; desc?: string }> }) {
  const styles = useStyles();
  return (
    <View style={[styles.card, { gap: spacing.lg }]}>
      {steps.map((step, i) => (
        <View key={step.title} style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            {step.desc ? <Text style={styles.featureDesc}>{step.desc}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function StatsGrid({ items = STATS }: { items?: Array<{ value: string; label: string }> }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {items.map((s, i) => (
        <View key={s.label} style={styles.statTile}>
          <Text style={[styles.statValue, i === 0 && styles.statValueAccent]}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function FaqAccordion({ items = FAQS, initiallyOpen = 0 }: { items?: Array<{ q: string; a: string }>; initiallyOpen?: number | null }) {
  const { c } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState<number | null>(initiallyOpen);
  return (
    <View style={[styles.card, { paddingVertical: 0 }]}>
      {items.map((item, i) => {
        const expanded = open === i;
        return (
          <View key={item.q} style={[styles.faqItem, i > 0 && styles.faqBorder]}>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpen(expanded ? null : i);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              style={styles.faqQ}
            >
              <Text style={[styles.faqQText, expanded && { color: c.brandInk }]}>{item.q}</Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={17} color={expanded ? c.brandInk : c.textFaint} />
            </Pressable>
            {expanded ? <Text style={styles.faqA}>{item.a}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

export function CtaCard({
  title,
  text,
  primary,
  secondary,
}: {
  title: string;
  text?: string;
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.card, styles.cta]}>
      <LinearGradient colors={[c.brandSoft, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 0.9 }} style={StyleSheet.absoluteFill} />
      <Title size={28} style={{ textAlign: "center" }}>
        {title}
      </Title>
      {text ? <Text style={[styles.featureDesc, { textAlign: "center", fontSize: font.sm }]}>{text}</Text> : null}
      <Button title={primary.label} onPress={primary.onPress} fullWidth iconRight="arrow-forward" />
      {secondary ? <Button title={secondary.label} variant="outline" onPress={secondary.onPress} fullWidth /> : null}
    </View>
  );
}

export function Footer() {
  const styles = useStyles();
  return (
    <View style={styles.footer}>
      <Logo size={20} />
      <View style={styles.footerCols}>
        <View style={styles.footerCol}>
          <Text style={styles.footerHead}>MƏHSUL</Text>
          <Text style={styles.footerLink}>İdmanlar</Text>
          <Text style={styles.footerLink}>Komandalar</Text>
          <Text style={styles.footerLink}>Liqalar</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.footerHead}>ŞİRKƏT</Text>
          <Text style={styles.footerLink}>Haqqımızda</Text>
          <Text style={styles.footerLink}>Əlaqə</Text>
          <Text style={styles.footerLink}>Karyera</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.footerHead}>DƏSTƏK</Text>
          <Text style={styles.footerLink}>FAQ</Text>
          <Text style={styles.footerLink}>Qaydalar</Text>
        </View>
      </View>
      <Text style={styles.copy}>© 2026 Rivalio. Bütün hüquqlar qorunur.</Text>
    </View>
  );
}

/** Photo card for a sport (only football is live; others show "Tezliklə"). */
export const SportCard = memo(function SportCard({ sport, onPress }: { sport: Sport; onPress: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={sport.available ? onPress : undefined}
      disabled={!sport.available}
      accessibilityRole="button"
      accessibilityLabel={`${sport.name}. ${sport.available ? "Bölməyə keç" : "Tezliklə"}`}
      accessibilityState={{ disabled: !sport.available }}
      style={({ pressed }) => [styles.sport, sport.available && styles.sportLive, pressed && { opacity: 0.9 }]}
    >
      <Image source={sport.image} style={styles.sportImage} resizeMode="cover" />
      <LinearGradient colors={["rgba(8,8,14,0.1)", "rgba(8,8,14,0.92)"]} style={StyleSheet.absoluteFill} />
      {!sport.available ? <View style={styles.dim} /> : null}
      <View style={styles.sportTop}>
        <View style={[styles.sportEmoji, { backgroundColor: `${sport.color}33` }]}>
          <Text style={{ fontSize: 20 }}>{sport.emoji}</Text>
        </View>
        <View style={[styles.sportBadge, sport.available ? { backgroundColor: c.brand } : styles.sportBadgeMuted]}>
          <Text style={[styles.sportBadgeText, { color: sport.available ? c.onBrand : "#FFFFFF" }]}>{sport.available ? sport.badge : "Tezliklə"}</Text>
        </View>
      </View>
      <View style={styles.sportBody}>
        <Text style={styles.sportName}>{sport.name}</Text>
        <Text style={styles.sportDesc} numberOfLines={2}>
          {sport.description}
        </Text>
        <View style={styles.sportFooter}>
          <View style={styles.sportMeta}>
            <Ionicons name="people" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.sportMetaText}>{sport.teamSize}</Text>
          </View>
          {sport.available ? (
            <View style={styles.sportCta}>
              <Text style={styles.sportCtaText}>Bölməyə keç</Text>
              <Ionicons name="arrow-forward" size={14} color={c.onBrand} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
    ...cardShadow(c),
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  feature: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 6,
    ...cardShadow(c),
  },
  featureTitle: { fontFamily: ff.bold, fontSize: 13.5, color: c.ink, marginTop: 4 },
  featureDesc: { fontFamily: ff.regular, fontSize: 12, lineHeight: 17, color: c.textMuted },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.brandSoft,
    borderWidth: 1,
    borderColor: c.brandBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: ff.displayBold, fontSize: 15, color: c.brandInk },
  stepTitle: { fontFamily: ff.bold, fontSize: 14, color: c.ink },
  statTile: {
    flexBasis: "47%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  statValue: { ...display(28), color: c.ink, lineHeight: 30 },
  statValueAccent: { color: c.brandInk },
  statLabel: { fontFamily: ff.medium, fontSize: 11.5, color: c.textMuted },
  faqItem: { paddingVertical: 14 },
  faqBorder: { borderTopWidth: 1, borderTopColor: c.border },
  faqQ: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  faqQText: { flex: 1, fontFamily: ff.semibold, fontSize: 14, color: c.ink },
  faqA: { fontFamily: ff.regular, fontSize: 13, lineHeight: 20, color: c.textMuted, marginTop: 8 },
  cta: { gap: 12, alignItems: "stretch", borderColor: c.brandBorder, overflow: "hidden", marginTop: spacing.xxl },
  footer: { gap: 16, marginTop: spacing.xxl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: c.border },
  footerCols: { flexDirection: "row", gap: 10 },
  footerCol: { flex: 1, gap: 6 },
  footerHead: { fontFamily: ff.bold, fontSize: 11, color: c.textFaint, letterSpacing: 0.6 },
  footerLink: { fontFamily: ff.regular, fontSize: 13, color: c.textMuted },
  copy: { fontFamily: ff.regular, fontSize: 11, color: c.textFaint },
  sport: { height: 190, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#101017", borderWidth: 1, borderColor: c.border },
  sportLive: { borderColor: c.brandBorder },
  sportImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8,8,14,0.4)" },
  sportTop: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sportEmoji: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sportBadge: { height: 24, paddingHorizontal: 10, borderRadius: radius.pill, justifyContent: "center" },
  sportBadgeMuted: { backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  sportBadgeText: { fontFamily: ff.bold, fontSize: 11 },
  sportBody: { flex: 1, padding: 14, justifyContent: "flex-end", gap: 3 },
  sportName: { ...display(26), color: "#FFFFFF" },
  sportDesc: { fontFamily: ff.regular, color: "rgba(255,255,255,0.78)", fontSize: 12.5, lineHeight: 17 },
  sportFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  sportMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  sportMetaText: { color: "rgba(255,255,255,0.85)", fontSize: 11.5, fontFamily: ff.semibold },
  sportCta: { flexDirection: "row", alignItems: "center", gap: 5, height: 30, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: c.brand },
  sportCtaText: { fontFamily: ff.bold, color: c.onBrand, fontSize: 12.5 },
}));
