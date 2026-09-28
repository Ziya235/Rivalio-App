import * as Linking from "expo-linking";
import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

/**
 * Shareable resources (mirrors the web routes /leagues/:id, /teams/:id,
 * /sports/football/championships/:id, /players/:id, /users/:id, /chat):
 *
 *   rivalio://league/12
 *   rivalio://championship/4
 *   rivalio://match/league/88        rivalio://match/championship/91
 *   rivalio://team/7
 *   rivalio://player/31              rivalio://user/5
 *   rivalio://chat/19
 *   rivalio://notifications
 *
 * Admins get the same URLs mapped onto their management screens.
 */

const num = (value: string) => Number(value);

// A link opened while signed out is kept and replayed after login.
let pendingUrl: string | null = null;
let initialConsumed = false;

export function rememberPendingLink(url: string | null) {
  if (url) pendingUrl = url;
}

async function initialUrl(): Promise<string | null> {
  if (pendingUrl) {
    const url = pendingUrl;
    pendingUrl = null;
    return url;
  }
  if (initialConsumed) return null;
  initialConsumed = true;
  return Linking.getInitialURL();
}

const prefixes = [Linking.createURL("/"), "rivalio://"];

export function buildLinking(mode: "guest" | "user" | "admin"): LinkingOptions<RootStackParamList> {
  if (mode === "guest") {
    return {
      prefixes,
      config: {
        screens: { Landing: "", GuestSports: "sports", About: "about-us", Faq: "faq", Login: "login", Register: "register" },
      },
      async getInitialURL() {
        const url = await Linking.getInitialURL();
        if (url && !/\/\/(login|register|sports|about-us|faq)?\/?$/.test(url)) rememberPendingLink(url);
        initialConsumed = true;
        return null;
      },
      subscribe(listener) {
        const sub = Linking.addEventListener("url", ({ url }) => {
          rememberPendingLink(url);
          listener(url);
        });
        return () => sub.remove();
      },
    };
  }

  const admin = mode === "admin";
  return {
    prefixes,
    getInitialURL: initialUrl,
    config: {
      screens: admin
        ? {
            AdminTabs: { screens: { Notifications: "notifications" } },
            AdminLeagueDetail: { path: "league/:leagueId", parse: { leagueId: num } },
            AdminChampionship: { path: "championship/:championshipId", parse: { championshipId: num } },
            AdminMatch: { path: "match/:kind/:matchId", parse: { matchId: num } },
            TeamDetail: { path: "team/:teamId", parse: { teamId: num } },
          }
        : {
            UserTabs: { screens: { Home: "home", Sports: "sports", Chats: "chat", Notifications: "notifications" } },
            Football: "sports/football",
            LeagueDetail: { path: "league/:leagueId", parse: { leagueId: num } },
            ChampionshipDetail: { path: "championship/:championshipId", parse: { championshipId: num } },
            MatchDetail: { path: "match/:kind/:matchId", parse: { matchId: num } },
            TeamDetail: { path: "team/:teamId", parse: { teamId: num } },
            PlayerProfile: { path: "player/:playerId", parse: { playerId: num } },
            ChatThread: { path: "chat/:conversationId", parse: { conversationId: num } },
          },
    },
  };
}
