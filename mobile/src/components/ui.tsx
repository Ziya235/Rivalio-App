import { memo, useState, type ReactNode, type Ref } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { mediaUrl } from "../api/client";
import {
  cardShadow,
  display,
  ff,
  font,
  onTone,
  radius,
  spacing,
  teamTone,
  toneColors,
  TOUCH_TARGET,
  type Palette,
  type Tone,
} from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import { initials } from "../utils/format";

export type IconName = keyof typeof Ionicons.glyphMap;

// ───────── Text ─────────

/** Uppercase condensed headline (Barlow Condensed). */
export function Title({ children, size = 30, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const styles = useStyles();
  return (
    <Text style={[styles.titleBase, display(size), style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Small uppercase label above headings ("DƏSTƏK", "İMKANLAR"). */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles();
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function SectionTitle({
  children,
  count,
  right,
}: {
  children: ReactNode;
  count?: number;
  right?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {children}
        {count != null ? <Text style={styles.sectionCount}>  {count}</Text> : null}
      </Text>
      {right}
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles();
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

// ───────── Brand ─────────

export function Logo({ size = 22 }: { size?: number }) {
  const styles = useStyles();
  const box = Math.round(size * 1.35);
  return (
    <View style={styles.logo} accessibilityLabel="Rivalio">
      <View style={[styles.logoMark, { width: box, height: box, borderRadius: box * 0.27 }]}>
        <Text style={[styles.logoMarkText, { fontSize: size * 0.85 }]}>R</Text>
      </View>
      <Text style={[styles.logoText, { fontSize: size }]}>
        Rival<Text style={styles.logoAccent}>io</Text>
      </Text>
    </View>
  );
}

// ───────── Buttons ─────────

type ButtonVariant = "primary" | "secondary" | "soft" | "outline" | "danger" | "stop" | "ghost" | "success";

function buttonTone(c: Palette, variant: ButtonVariant): { bg: string; fg: string; border: string } {
  switch (variant) {
    case "primary":
      return { bg: c.brand, fg: c.onBrand, border: c.brand };
    case "secondary":
      return { bg: c.inverse, fg: c.onInverse, border: c.inverse };
    case "soft":
      return { bg: c.cardMuted, fg: c.ink, border: c.borderStrong };
    case "outline":
      return { bg: "transparent", fg: c.ink, border: c.borderStrong };
    case "danger":
      return { bg: c.redSoft, fg: c.red, border: c.redSoft };
    case "stop":
      return { bg: c.live, fg: c.white, border: c.live };
    case "success":
      return { bg: c.brandSoft, fg: c.brandInk, border: c.brandBorder };
    default:
      return { bg: "transparent", fg: c.textMuted, border: "transparent" };
  }
}

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  iconRight,
  loading,
  disabled,
  size = "md",
  style,
  fullWidth,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const tone = buttonTone(c, variant);
  const inactive = disabled || loading;
  const height = size === "sm" ? 36 : size === "lg" ? 52 : TOUCH_TARGET + 2;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      hitSlop={size === "sm" ? 6 : 0}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: height,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          borderRadius: size === "sm" ? 10 : radius.md,
          paddingHorizontal: size === "sm" ? spacing.md : spacing.lg,
          opacity: inactive ? 0.45 : pressed ? 0.85 : 1,
        },
        variant === "primary" && !inactive && styles.buttonGlow,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={size === "sm" ? 15 : 18} color={tone.fg} />
      ) : null}
      <Text
        style={[styles.buttonText, { color: tone.fg, fontSize: size === "sm" ? font.sm : font.md }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {iconRight && !loading ? <Ionicons name={iconRight} size={size === "sm" ? 15 : 18} color={tone.fg} /> : null}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  badge,
  bordered,
  size = TOUCH_TARGET,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  badge?: number;
  /** Square outlined button used in top bars. */
  bordered?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        bordered && [styles.iconButtonBordered, { width: size - 4, height: size - 4 }],
        !bordered && { width: size, height: size },
        { opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Ionicons name={icon} size={bordered ? 19 : 22} color={color ?? c.ink} />
      {badge ? <CountBadge count={badge} style={styles.iconBadge} /> : null}
    </Pressable>
  );
}

export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  if (count <= 0) return null;
  return (
    <View style={[styles.countBadge, style]}>
      <Text style={styles.countBadgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

// ───────── Containers ─────────

export function Card({
  children,
  style,
  onPress,
  highlight,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Lime border for the item that needs attention (live match, leader). */
  highlight?: boolean;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, highlight && styles.cardHighlight, style, pressed && styles.cardPressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, highlight && styles.cardHighlight, style]}>{children}</View>;
}

export function Row({
  children,
  style,
  gap = spacing.sm,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  const styles = useStyles();
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

export function Divider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

/** Uppercase divider label with a hairline ("BU GÜN", "YENİ MESAJ"). */
export function DividerLabel({ label, accent }: { label: string; accent?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.dividerLabel}>
      <Text style={[styles.dividerLabelText, accent && styles.dividerLabelAccent]}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const styles = useStyles();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
    </View>
  );
}

/** Tinted notice (warning / info / error), like the admin mockups. */
export function InfoBox({ tone = "blue", icon, children }: { tone?: "orange" | "blue" | "red" | "lime"; icon?: IconName; children: ReactNode }) {
  const { c } = useTheme();
  const styles = useStyles();
  const t = toneColors(c, tone);
  const fallback: IconName = tone === "orange" ? "warning-outline" : tone === "red" ? "alert-circle-outline" : "information-circle-outline";
  return (
    <View style={[styles.infoBox, { backgroundColor: t.bg }]}>
      <Ionicons name={icon ?? fallback} size={17} color={t.fg} style={{ marginTop: 1 }} />
      <Text style={[styles.infoBoxText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

// ───────── Pills / badges ─────────

export function Pill({
  label,
  tone,
  fg,
  bg,
  border,
  icon,
}: {
  label: string;
  tone?: Tone;
  fg?: string;
  bg?: string;
  border?: string;
  icon?: IconName;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const t = toneColors(c, tone ?? "gray");
  const colorFg = fg ?? t.fg;
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? t.bg, borderColor: border ?? bg ?? t.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={colorFg} /> : null}
      <Text style={[styles.pillText, { color: colorFg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function StatusPill({ tone, label }: { tone: "pending" | "accepted" | "rejected" | "info"; label: string }) {
  const map = {
    pending: { tone: "orange" as Tone, icon: "hourglass-outline" as IconName },
    accepted: { tone: "lime" as Tone, icon: "checkmark" as IconName },
    rejected: { tone: "red" as Tone, icon: "close" as IconName },
    info: { tone: "blue" as Tone, icon: "information-circle-outline" as IconName },
  }[tone];
  return <Pill label={label} tone={map.tone} icon={map.icon} />;
}

export function LivePill({ label }: { label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.live} accessibilityLabel={`Canlı ${label}`}>
      <Ionicons name="radio-outline" size={12} color="#FFFFFF" />
      <Text style={styles.liveText}>{label}</Text>
    </View>
  );
}

// ───────── Tabs / chips ─────────

export type TabVariant = "tabs" | "chips" | "pills";

export function Chip({
  label,
  active,
  onPress,
  count,
  variant = "chips",
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
  variant?: TabVariant;
}) {
  const styles = useStyles();
  if (variant === "tabs") {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={[styles.tab, active && styles.tabActive]}
      >
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
        {count ? <CountBadge count={count} /> : null}
      </Pressable>
    );
  }
  const pills = variant === "pills";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[pills ? styles.pillTab : styles.chip, active && (pills ? styles.pillTabActive : styles.chipActive)]}
    >
      <Text style={[styles.chipText, active && (pills ? styles.pillTabTextActive : styles.chipTextActive)]}>{label}</Text>
      {count ? <CountBadge count={count} style={styles.chipBadge} /> : null}
    </Pressable>
  );
}

// ───────── Inputs ─────────

export function TextField({
  label,
  error,
  hint,
  style,
  ref,
  icon,
  required,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  ref?: Ref<TextInput>;
  icon?: IconName;
  required?: boolean;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          props.multiline && styles.inputWrapMultiline,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {icon ? <Ionicons name={icon} size={17} color={c.textMuted} style={props.multiline ? { marginTop: 13 } : undefined} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textFaint}
          selectionColor={c.brand}
          accessibilityLabel={label ?? props.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, props.multiline && styles.inputMultiline, style]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// ───────── Avatars ─────────

export const Avatar = memo(function Avatar({
  uri,
  name,
  size = 44,
  tone,
  rounded = true,
}: {
  uri?: string | null;
  name: string;
  size?: number;
  tone?: string;
  rounded?: boolean;
}) {
  const { c } = useTheme();
  const source = mediaUrl(uri);
  const borderRadius = rounded ? size / 2 : size * 0.28;
  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={{ width: size, height: size, borderRadius, backgroundColor: c.cardMuted }}
        accessibilityIgnoresInvertColors
      />
    );
  }
  const text = (
    <Text
      style={{
        color: tone ? onTone(tone) : c.brandInk,
        fontFamily: ff.displayBold,
        fontSize: Math.max(12, size * 0.4),
        letterSpacing: 0.3,
      }}
    >
      {initials(name)}
    </Text>
  );
  if (tone) {
    return (
      <View style={{ width: size, height: size, borderRadius, backgroundColor: tone, alignItems: "center", justifyContent: "center" }}>
        {text}
      </View>
    );
  }
  return (
    <LinearGradient
      colors={["rgba(197,241,53,0.3)", "rgba(124,58,237,0.45)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: size >= 72 ? 2 : 1,
        borderColor: c.brandBorder,
      }}
    >
      {text}
    </LinearGradient>
  );
});

export function TeamCrest({ name, logo, size = 40 }: { name: string; logo?: string | null; size?: number }) {
  return <Avatar uri={logo} name={name} size={size} tone={teamTone(name)} rounded={false} />;
}

/** Tinted rounded square holding an icon (feature tiles, notification types). */
export function IconTile({ icon, tone = "lime", size = 40 }: { icon: IconName; tone?: Tone; size?: number }) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={t.fg} />
    </View>
  );
}

// ───────── Stat tile ─────────

export function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ───────── Meta line ─────────

export function Meta({ icon, text }: { icon: IconName; text: string }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={c.textMuted} />
      <Text style={styles.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  titleBase: { color: c.ink },
  eyebrow: {
    fontFamily: ff.bold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: c.brandInk,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
  },
  sectionTitle: { ...display(19, "bold"), letterSpacing: 0.6, color: c.ink, flexShrink: 1 },
  sectionCount: { color: c.textFaint, fontFamily: ff.display },
  muted: { fontFamily: ff.regular, fontSize: font.sm, color: c.textMuted, lineHeight: 19 },
  logo: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { backgroundColor: c.brand, alignItems: "center", justifyContent: "center" },
  logoMarkText: { fontFamily: ff.displayBlack, color: c.onBrand },
  logoText: { fontFamily: ff.displayBold, color: c.ink, letterSpacing: 0.2 },
  logoAccent: { color: c.brandInk },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
  },
  buttonGlow: {
    shadowColor: c.brand,
    shadowOpacity: c.isDark ? 0.45 : 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonText: { fontFamily: ff.semibold },
  fullWidth: { alignSelf: "stretch" },
  iconButton: { alignItems: "center", justifyContent: "center" },
  iconButtonBordered: { borderRadius: 12, borderWidth: 1, borderColor: c.borderStrong },
  iconBadge: { position: "absolute", top: -6, right: -6 },
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { color: c.onBrand, fontSize: 10, fontFamily: ff.extrabold },
  card: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    padding: spacing.lg - 2,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  cardHighlight: { borderColor: c.brandBorder },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  row: { flexDirection: "row", alignItems: "center" },
  divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.md },
  dividerLabel: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: spacing.xs },
  dividerLabelText: { fontFamily: ff.bold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: c.textFaint },
  dividerLabelAccent: { color: c.brandInk },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: c.cardMuted, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: c.brand },
  infoBox: { flexDirection: "row", gap: 9, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  infoBoxText: { flex: 1, fontFamily: ff.medium, fontSize: 12.5, lineHeight: 18 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 22,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: font.xs, fontFamily: ff.bold },
  live: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: c.live,
    height: 22,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  liveText: { color: "#FFFFFF", fontSize: font.xs, fontFamily: ff.extrabold },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 11,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: c.brand },
  tabText: { fontFamily: ff.semibold, fontSize: 13.5, color: c.textFaint },
  tabTextActive: { color: c.brandInk },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  chipActive: { backgroundColor: c.brand, borderColor: c.brand },
  chipText: { fontSize: 12.5, fontFamily: ff.semibold, color: c.textMuted },
  chipTextActive: { color: c.onBrand },
  pillTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  pillTabActive: { backgroundColor: c.inverse, borderColor: c.inverse },
  pillTabTextActive: { color: c.onInverse },
  chipBadge: { marginLeft: 2 },
  field: { marginBottom: spacing.md },
  label: { fontSize: 12.5, fontFamily: ff.semibold, color: c.textMuted, marginBottom: 6 },
  required: { color: c.brandInk },
  inputWrap: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.input,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputWrapMultiline: { alignItems: "flex-start" },
  inputFocused: { borderColor: c.brand },
  inputError: { borderColor: c.red },
  input: { flex: 1, minHeight: 46, fontSize: font.md, fontFamily: ff.regular, color: c.ink, paddingVertical: 0 },
  inputMultiline: { minHeight: 96, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top" },
  errorText: { color: c.red, fontSize: font.xs, marginTop: 5, fontFamily: ff.semibold },
  hint: { color: c.textFaint, fontSize: font.xs, marginTop: 5, fontFamily: ff.regular },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  statValue: { fontFamily: ff.displayBold, fontSize: 28, lineHeight: 30, color: c.ink },
  statValueAccent: { color: c.brandInk },
  statLabel: { fontSize: 11.5, color: c.textMuted, marginTop: 2, fontFamily: ff.medium },
  meta: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%" },
  metaText: { fontSize: 12.5, fontFamily: ff.regular, color: c.textMuted, flexShrink: 1 },
}));
