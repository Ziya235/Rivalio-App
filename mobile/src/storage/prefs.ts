import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeMode } from "../theme";

// Non-sensitive per-device preferences only (never tokens or personal data).

const chatSeenKey = (userId: number) => `rivalio.chatBadgeSeenAt.${userId}`;
const themeKey = (role: "user" | "admin") => `rivalio.theme.${role}`;

export const prefs = {
  async getChatSeenAt(userId: number): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(chatSeenKey(userId));
    } catch {
      return null;
    }
  },
  async setChatSeenAt(userId: number, iso: string): Promise<void> {
    try {
      await AsyncStorage.setItem(chatSeenKey(userId), iso);
    } catch {
      // A lost badge timestamp only means the badge may reappear — acceptable.
    }
  },
  async getTheme(role: "user" | "admin"): Promise<ThemeMode | null> {
    try {
      const value = await AsyncStorage.getItem(themeKey(role));
      return value === "dark" || value === "light" ? value : null;
    } catch {
      return null;
    }
  },
  async setTheme(role: "user" | "admin", mode: ThemeMode): Promise<void> {
    try {
      await AsyncStorage.setItem(themeKey(role), mode);
    } catch {
      // Falls back to the role default next launch.
    }
  },
};
