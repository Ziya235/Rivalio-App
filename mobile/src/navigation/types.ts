import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/** Tabs of the football hub (web /sports/football). */
export type FootballSection = "teams" | "players" | "challenges" | "leagues" | "championships";

export type UserTabParamList = {
  Home: undefined;
  Sports: undefined;
  Chats: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  AdminLeagues: undefined;
  AdminChampionships: undefined;
  Notifications: undefined;
  /** Replaces the web admin sidebar: sports, account, theme, logout. */
  Menu: undefined;
};

export type MatchKind = "league" | "championship";

export type RootStackParamList = {
  // Guest (the public web pages + auth)
  Landing: undefined;
  GuestSports: undefined;
  Login: undefined;
  Register: undefined;
  // Everyone
  About: undefined;
  Faq: undefined;
  // Signed in
  UserTabs: NavigatorScreenParams<UserTabParamList> | undefined;
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  Football: { section?: FootballSection } | undefined;
  TeamDetail: { teamId: number };
  LeagueDetail: { leagueId: number };
  LeagueTeam: { leagueId: number; teamId: number };
  ChampionshipDetail: { championshipId: number };
  MatchDetail: { matchId: number; kind: MatchKind };
  PlayerProfile: { playerId?: number; userId?: number };
  UserSearch: undefined;
  ChatThread: { conversationId?: number; userId?: number };
  EditProfile: undefined;
  // Admin only
  AdminLeagueDetail: { leagueId: number };
  AdminChampionship: { championshipId: number };
  AdminMatch: { matchId: number };
  AdminProfile: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
