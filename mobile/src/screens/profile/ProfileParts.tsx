import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Button, Title } from "../../components/ui";
import { cardShadow, ff, font, radius, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";

/** Centered avatar with a soft violet glow, name and @username (web ProfileHeader). */
export function ProfileHero({
  image,
  name,
  sub,
  onPressAvatar,
  uploading,
  children,
}: {
  image: string | null | undefined;
  name: string;
  sub: string;
  onPressAvatar?: () => void;
  uploading?: boolean;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <LinearGradient colors={[c.violetSoft, "transparent"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.75 }} style={StyleSheet.absoluteFill} />
      <Pressable
        onPress={onPressAvatar}
        disabled={!onPressAvatar || uploading}
        accessibilityRole={onPressAvatar ? "button" : undefined}
        accessibilityLabel={onPressAvatar ? "Profil şəklini dəyiş" : name}
      >
        <Avatar uri={image} name={name} size={88} />
        {onPressAvatar ? (
          <View style={styles.camera}>
            <Ionicons name={uploading ? "hourglass-outline" : "camera"} size={14} color={c.onBrand} />
          </View>
        ) : null}
      </Pressable>
      <Title size={28} style={{ textAlign: "center" }}>
        {name}
      </Title>
      <Text style={styles.username}>{sub}</Text>
      {children}
    </View>
  );
}

/** Label/value rows in a card, with an optional title and action (e.g. "Redaktə et"). */
export function InfoRows({
  rows,
  title,
  action,
}: {
  rows: Array<[string, string | number | null | undefined]>;
  title?: string;
  action?: { label: string; onPress: () => void };
}) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      {title || action ? (
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{title}</Text>
          {action ? <Button title={action.label} icon="create-outline" size="sm" variant="outline" onPress={action.onPress} /> : null}
        </View>
      ) : null}
      {rows.map(([label, value], i) => {
        const empty = value === null || value === undefined || value === "";
        const long = typeof value === "string" && value.length > 28;
        return (
          <View key={label} style={[styles.infoRow, (i > 0 || Boolean(title || action)) && styles.infoBorder, long && styles.infoRowStacked]}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, empty && styles.infoEmpty, !long && { textAlign: "right" }]}>{empty ? "—" : String(value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  hero: { alignItems: "center", gap: 6, paddingTop: spacing.md, paddingBottom: spacing.lg, marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: c.bg,
  },
  username: { fontFamily: ff.semibold, fontSize: 13.5, color: c.brandInk },
  card: { borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, ...cardShadow(c) },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 56 },
  cardTitle: { fontFamily: ff.bold, fontSize: 14, color: c.ink },
  infoRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 10 },
  infoRowStacked: { flexDirection: "column", alignItems: "flex-start", gap: 4 },
  infoBorder: { borderTopWidth: 1, borderTopColor: c.border },
  infoLabel: { fontSize: font.sm, fontFamily: ff.regular, color: c.textMuted },
  infoValue: { flexShrink: 1, fontSize: font.sm + 1, color: c.ink, fontFamily: ff.semibold, lineHeight: 20 },
  infoEmpty: { color: c.textFaint, fontFamily: ff.regular },
}));
