import { useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { display, ff, font, radius, spacing } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { Button, IconButton, Logo, type IconName } from "./ui";

/**
 * App top bar from the mockups: either the Rivalio logo or a big condensed title
 * on the left, square outlined actions on the right. Handles the top safe area.
 */
export function TopBar({
  title,
  logo,
  back,
  right,
  badge,
}: {
  title?: string;
  logo?: boolean;
  back?: boolean;
  right?: ReactNode;
  /** Small pill next to the logo (e.g. "Admin"). */
  badge?: string;
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useStyles();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      {back && navigation.canGoBack() ? (
        <IconButton icon="chevron-back" label="Geri" bordered size={44} onPress={() => navigation.goBack()} />
      ) : null}
      {logo ? <Logo /> : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {title ? (
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={styles.actions}>{right}</View>
    </View>
  );
}

/** Sun/moon switch for the top bar. */
export function ThemeToggleButton() {
  const { mode, toggle } = useTheme();
  return (
    <IconButton
      icon={mode === "dark" ? "sunny-outline" : "moon-outline"}
      label={mode === "dark" ? "İşıqlı temaya keç" : "Qaranlıq temaya keç"}
      bordered
      size={44}
      onPress={toggle}
    />
  );
}

type GuestLink = { icon: IconName; label: string; route: "Landing" | "GuestSports" | "About" | "Faq" };

const GUEST_LINKS: GuestLink[] = [
  { icon: "home-outline", label: "Ana Səhifə", route: "Landing" },
  { icon: "football-outline", label: "İdmanlar", route: "GuestSports" },
  { icon: "people-outline", label: "Haqqımızda", route: "About" },
  { icon: "help-circle-outline", label: "FAQ", route: "Faq" },
];

/** Hamburger + drawer for signed-out visitors (the web header's mobile menu). */
export function GuestMenuButton({ current }: { current?: GuestLink["route"] }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { c, mode, toggle } = useTheme();
  const styles = useStyles();

  const go = (route: keyof RootStackParamList) => {
    setOpen(false);
    if (route !== current) navigation.navigate(route as never);
  };

  return (
    <>
      <IconButton icon="menu" label="Menyu" bordered size={44} onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} accessibilityLabel="Menyunu bağla" />
        <View style={[styles.drawer, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.drawerHead}>
            <Logo />
            <IconButton icon="close" label="Bağla" bordered size={40} onPress={() => setOpen(false)} />
          </View>
          {GUEST_LINKS.map((link) => {
            const active = link.route === current;
            return (
              <Pressable
                key={link.route}
                onPress={() => go(link.route)}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                style={[styles.link, active && styles.linkActive]}
              >
                <Ionicons name={link.icon} size={20} color={active ? c.brandInk : c.textMuted} />
                <Text style={[styles.linkText, active && styles.linkTextActive]}>{link.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={toggle} accessibilityRole="switch" accessibilityState={{ checked: mode === "dark" }} style={styles.themeRow}>
            <Ionicons name="moon-outline" size={20} color={c.textMuted} />
            <Text style={[styles.linkText, { flex: 1, fontSize: font.sm }]}>Qaranlıq tema</Text>
            <View style={[styles.switch, mode === "dark" && styles.switchOn]}>
              <View style={[styles.thumb, mode === "dark" && styles.thumbOn]} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={{ gap: spacing.sm }}>
            <Button title="Daxil ol" variant="outline" onPress={() => go("Login")} fullWidth />
            <Button title="Qeydiyyatdan keç" onPress={() => go("Register")} fullWidth />
          </View>
        </View>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
    backgroundColor: "transparent",
  },
  title: { flex: 1, ...display(24, "bold"), letterSpacing: 0.4, color: c.ink },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { height: 22, paddingHorizontal: 9, borderRadius: radius.pill, backgroundColor: c.cardMuted, justifyContent: "center" },
  badgeText: { fontFamily: ff.bold, fontSize: 11, color: c.textMuted },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: c.overlay },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "84%",
    backgroundColor: c.card,
    borderLeftWidth: 1,
    borderLeftColor: c.borderStrong,
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  drawerHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  link: { flexDirection: "row", alignItems: "center", gap: 12, height: 50, paddingHorizontal: 14, borderRadius: radius.md },
  linkActive: { backgroundColor: c.brandSoft },
  linkText: { fontFamily: ff.semibold, fontSize: font.md, color: c.ink },
  linkTextActive: { color: c.brandInk },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 52,
    paddingHorizontal: 14,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  switch: { width: 42, height: 24, borderRadius: 12, backgroundColor: c.cardMuted, justifyContent: "center" },
  switchOn: { backgroundColor: c.brand },
  thumb: { width: 18, height: 18, borderRadius: 9, marginLeft: 3, backgroundColor: c.textFaint },
  thumbOn: { marginLeft: 21, backgroundColor: c.onBrand },
}));
