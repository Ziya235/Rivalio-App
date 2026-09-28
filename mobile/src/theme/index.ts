import type { TextStyle } from "react-native";

// Rivalio visual identity, mirrors frontend/src/index.css and design/mobile-mockups.html:
// near-black #08080E canvas with a lime #C5F135 accent (dark, the default for players),
// the web light-mode gradient (#E8FFF3 → #EAF8FF → #F2EDFF) and the admin's #F3F4F6.
// Display type is Barlow Condensed, body type DM Sans.

export type ThemeMode = "dark" | "light";

export type Palette = {
  isDark: boolean;
  /** Lime accent (buttons, active states). Same in both themes. */
  brand: string;
  brandDark: string;
  /** Tinted lime surface. */
  brandSoft: string;
  brandBorder: string;
  /** Lime-coloured text; darkens to olive on light backgrounds for contrast. */
  brandInk: string;
  /** Text/icons placed on a solid `brand` surface. */
  onBrand: string;
  /** Strongest text (headings). */
  ink: string;
  text: string;
  textMuted: string;
  textFaint: string;
  bg: string;
  /** Screen background gradient; null means a flat `bg`. */
  gradient: readonly [string, string, ...string[]] | null;
  card: string;
  cardMuted: string;
  input: string;
  border: string;
  borderStrong: string;
  /** High-contrast solid surface ("ink" buttons, active pills). */
  inverse: string;
  onInverse: string;
  green: string;
  greenSoft: string;
  greenBorder: string;
  sky: string;
  skySoft: string;
  skyBorder: string;
  violet: string;
  violetSoft: string;
  violetBorder: string;
  amber: string;
  amberSoft: string;
  amberBorder: string;
  red: string;
  redSoft: string;
  redBorder: string;
  live: string;
  liveSoft: string;
  white: string;
  overlay: string;
  tabBar: string;
  shadowOpacity: number;
};

const shared = {
  brand: "#C5F135",
  brandDark: "#9BBF28",
  onBrand: "#08080E",
  live: "#EF4444",
  white: "#FFFFFF",
} as const;

export const darkPalette: Palette = {
  ...shared,
  isDark: true,
  brandSoft: "rgba(197,241,53,0.12)",
  brandBorder: "rgba(197,241,53,0.32)",
  brandInk: "#C5F135",
  ink: "#FFFFFF",
  text: "rgba(255,255,255,0.86)",
  textMuted: "rgba(255,255,255,0.58)",
  textFaint: "rgba(255,255,255,0.38)",
  bg: "#08080E",
  gradient: null,
  card: "#101017",
  cardMuted: "#18181F",
  input: "#0C0C13",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.14)",
  inverse: "#FFFFFF",
  onInverse: "#08080E",
  green: "#4ADE80",
  greenSoft: "rgba(34,197,94,0.14)",
  greenBorder: "rgba(34,197,94,0.32)",
  sky: "#60A5FA",
  skySoft: "rgba(59,130,246,0.16)",
  skyBorder: "rgba(59,130,246,0.32)",
  violet: "#A78BFA",
  violetSoft: "rgba(124,58,237,0.18)",
  violetBorder: "rgba(124,58,237,0.36)",
  amber: "#FB923C",
  amberSoft: "rgba(249,115,22,0.15)",
  amberBorder: "rgba(249,115,22,0.32)",
  red: "#F87171",
  redSoft: "rgba(239,68,68,0.13)",
  redBorder: "rgba(239,68,68,0.32)",
  liveSoft: "rgba(239,68,68,0.16)",
  overlay: "rgba(0,0,0,0.62)",
  tabBar: "rgba(12,12,18,0.96)",
  shadowOpacity: 0,
};

export const lightPalette: Palette = {
  ...shared,
  isDark: false,
  brandSoft: "rgba(197,241,53,0.28)",
  brandBorder: "rgba(110,150,15,0.35)",
  brandInk: "#4D6B0B",
  ink: "#0F172A",
  text: "#1E293B",
  textMuted: "#52606F",
  textFaint: "#8995A2",
  bg: "#EEF6F8",
  gradient: ["#E8FFF3", "#EAF8FF", "#F2EDFF"],
  card: "#FFFFFF",
  cardMuted: "#F1F5F9",
  input: "#FFFFFF",
  border: "rgba(15,23,42,0.08)",
  borderStrong: "rgba(15,23,42,0.14)",
  inverse: "#0F172A",
  onInverse: "#FFFFFF",
  green: "#16A34A",
  greenSoft: "rgba(34,197,94,0.12)",
  greenBorder: "rgba(22,163,74,0.3)",
  sky: "#2563EB",
  skySoft: "rgba(59,130,246,0.1)",
  skyBorder: "rgba(37,99,235,0.28)",
  violet: "#6D28D9",
  violetSoft: "rgba(124,58,237,0.1)",
  violetBorder: "rgba(109,40,217,0.28)",
  amber: "#C2410C",
  amberSoft: "rgba(249,115,22,0.12)",
  amberBorder: "rgba(194,65,12,0.28)",
  red: "#DC2626",
  redSoft: "rgba(239,68,68,0.1)",
  redBorder: "rgba(220,38,38,0.28)",
  liveSoft: "rgba(239,68,68,0.1)",
  overlay: "rgba(15,23,42,0.4)",
  tabBar: "rgba(255,255,255,0.97)",
  shadowOpacity: 0.06,
};

/** The admin panel is a flat #F3F4F6 in light mode, like the web admin. */
export const adminLightPalette: Palette = { ...lightPalette, bg: "#F3F4F6", gradient: null };

// ───────── Type ─────────

export const ff = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  extrabold: "DMSans_800ExtraBold",
  display: "BarlowCondensed_700Bold",
  displayBold: "BarlowCondensed_800ExtraBold",
  displayBlack: "BarlowCondensed_900Black",
} as const;

/** Uppercase condensed headline, the signature of the Rivalio pages. */
export function display(size: number, weight: "bold" | "extrabold" | "black" = "extrabold"): TextStyle {
  return {
    fontFamily: weight === "bold" ? ff.display : weight === "black" ? ff.displayBlack : ff.displayBold,
    fontSize: size,
    lineHeight: Math.round(size * 1.02),
    textTransform: "uppercase",
    letterSpacing: 0.2,
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const font = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 34,
} as const;

/** Minimum touch target per Apple HIG / Material guidelines. */
export const TOUCH_TARGET = 44;

export function cardShadow(c: Palette) {
  return c.shadowOpacity > 0
    ? {
        shadowColor: "#0F172A",
        shadowOpacity: c.shadowOpacity,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }
    : {};
}

// ───────── Semantic tones (pills, icon tiles) ─────────

export type Tone = "lime" | "green" | "blue" | "violet" | "orange" | "red" | "gray" | "live";

export function toneColors(c: Palette, tone: Tone): { fg: string; bg: string; border: string } {
  switch (tone) {
    case "lime":
      return { fg: c.brandInk, bg: c.brandSoft, border: c.brandBorder };
    case "green":
      return { fg: c.green, bg: c.greenSoft, border: c.greenBorder };
    case "blue":
      return { fg: c.sky, bg: c.skySoft, border: c.skyBorder };
    case "violet":
      return { fg: c.violet, bg: c.violetSoft, border: c.violetBorder };
    case "orange":
      return { fg: c.amber, bg: c.amberSoft, border: c.amberBorder };
    case "red":
      return { fg: c.red, bg: c.redSoft, border: c.redBorder };
    case "live":
      return { fg: c.white, bg: c.live, border: c.live };
    default:
      return { fg: c.textMuted, bg: c.cardMuted, border: c.border };
  }
}

// ───────── Team crests ─────────

const TEAM_TONES = [
  "#F97316",
  "#7C3AED",
  "#10B981",
  "#EF4444",
  "#2563EB",
  "#0EA5E9",
  "#EAB308",
  "#334155",
] as const;

/** Stable colour per team name (same hash as frontend/src/lib/teamAvatar.ts). */
export function teamTone(name: string): string {
  const key = name.trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33 + key.charCodeAt(i)) >>> 0;
  }
  return TEAM_TONES[hash % TEAM_TONES.length];
}

/** Dark text reads better than white on the yellow crest. */
export function onTone(tone: string): string {
  return tone === "#EAB308" ? "#1A1400" : "#FFFFFF";
}
