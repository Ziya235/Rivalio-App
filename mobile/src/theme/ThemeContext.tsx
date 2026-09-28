import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import { prefs } from "../storage/prefs";
import { adminLightPalette, darkPalette, lightPalette, type Palette, type ThemeMode } from "./index";

type ThemeContextValue = {
  c: Palette;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Players default to the dark look, admins to the light admin panel (like the web).
 * The choice is remembered per role on this device.
 */
export function ThemeProvider({ role, children }: { role: "user" | "admin"; children: ReactNode }) {
  const fallback: ThemeMode = role === "admin" ? "light" : "dark";
  const [mode, setModeState] = useState<ThemeMode>(fallback);

  useEffect(() => {
    let cancelled = false;
    setModeState(fallback);
    void prefs.getTheme(role).then((saved) => {
      if (!cancelled && saved) setModeState(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [role, fallback]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      void prefs.setTheme(role, next);
    },
    [role],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const c = mode === "dark" ? darkPalette : role === "admin" ? adminLightPalette : lightPalette;
    return { c, mode, setMode, toggle: () => setMode(mode === "dark" ? "light" : "dark") };
  }, [mode, role, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Pins a subtree to one palette (auth screens are always dark, like the web). */
export function ThemeOverride({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const parent = useTheme();
  const value = useMemo<ThemeContextValue>(
    () => ({ ...parent, mode, c: mode === "dark" ? darkPalette : lightPalette }),
    [parent, mode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Theme-aware StyleSheet: `const useStyles = makeStyles((c) => ({ ... }))`, then
 * `const styles = useStyles()` inside the component. One sheet is built per palette.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: Palette) => T): () => T {
  const cache = new WeakMap<Palette, T>();
  return function useStyles() {
    const { c } = useTheme();
    let sheet = cache.get(c);
    if (!sheet) {
      sheet = StyleSheet.create(factory(c));
      cache.set(c, sheet);
    }
    return sheet;
  };
}
