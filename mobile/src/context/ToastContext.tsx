import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ff, font, radius, spacing, toneColors, type Tone } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<ToastKind, { tone: Tone; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { tone: "lime", icon: "checkmark-circle" },
  error: { tone: "red", icon: "alert-circle" },
  info: { tone: "blue", icon: "information-circle" },
};

/** Top toast in the web's style (tinted, bordered, blurred card). Must sit inside ThemeProvider. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      counter.current += 1;
      setToast({ id: counter.current, kind, message });
      AccessibilityInfo.announceForAccessibility(message);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(hide, kind === "error" ? 4000 : 2800);
    },
    [hide, opacity],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => show("success", m),
      error: (m) => show("error", m),
      info: (m) => show("info", m),
    }),
    [show],
  );

  const tone = toast ? toneColors(c, TONE[toast.kind].tone) : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && tone ? (
        <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm, opacity }]}>
          <Pressable onPress={hide} accessibilityRole="alert" style={[styles.toast, { borderColor: tone.border }]}>
            <Ionicons name={TONE[toast.kind].icon} size={20} color={tone.fg} />
            <Text style={[styles.text, { color: tone.fg }]}>{toast.message}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const useStyles = makeStyles((c) => ({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 1000 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: c.card,
    shadowColor: "#000",
    shadowOpacity: c.isDark ? 0.5 : 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  text: { flex: 1, fontSize: font.sm, fontFamily: ff.semibold },
}));
