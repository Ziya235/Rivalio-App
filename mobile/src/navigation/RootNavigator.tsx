import { useMemo } from "react";
import { DarkTheme, DefaultTheme, NavigationContainer, useNavigation, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { createBottomTabNavigator, type BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { confirm } from "../components/fields";
import { ErrorState, LoadingView } from "../components/states";
import { Screen } from "../components/Screen";
import { TabBar } from "../components/TabBar";
import { ThemeToggleButton, TopBar } from "../components/TopBar";
import { IconButton, Logo } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { ff, font } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import { buildLinking } from "./linking";
import type { AdminTabParamList, RootStackParamList, UserTabParamList } from "./types";
import { LandingScreen } from "../screens/guest/LandingScreen";
import { SportsScreen } from "../screens/guest/SportsScreen";
import { AboutScreen } from "../screens/guest/AboutScreen";
import { FaqScreen } from "../screens/guest/FaqScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { FootballScreen } from "../screens/football/FootballScreen";
import { ChatsScreen } from "../screens/chat/ChatsScreen";
import { ChatThreadScreen } from "../screens/chat/ChatThreadScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { AdminProfileScreen, MyProfileScreen } from "../screens/profile/MyProfileScreen";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { PlayerProfileScreen } from "../screens/profile/PlayerProfileScreen";
import { TeamDetailScreen } from "../screens/team/TeamDetailScreen";
import { LeagueTeamScreen } from "../screens/team/LeagueTeamScreen";
import { LeagueDetailScreen } from "../screens/league/LeagueDetailScreen";
import { ChampionshipDetailScreen } from "../screens/championship/ChampionshipDetailScreen";
import { MatchDetailScreen } from "../screens/match/MatchDetailScreen";
import { UserSearchScreen } from "../screens/search/UserSearchScreen";
import { AdminLeaguesScreen } from "../screens/admin/AdminLeaguesScreen";
import { AdminLeagueDetailScreen } from "../screens/admin/AdminLeagueDetailScreen";
import { AdminChampionshipsScreen } from "../screens/admin/AdminChampionshipsScreen";
import { AdminChampionshipScreen } from "../screens/admin/AdminChampionshipScreen";
import { AdminMatchScreen } from "../screens/admin/AdminMatchScreen";
import { AdminMenuScreen } from "../screens/admin/AdminMenuScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const UserTab = createBottomTabNavigator<UserTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

function tabOptions(icon: IconName, activeIcon: IconName, title: string, badge?: number): BottomTabNavigationOptions {
  return {
    title,
    tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? activeIcon : icon} size={size} color={color} />,
    tabBarBadge: badge && badge > 0 ? (badge > 99 ? "99+" : badge) : undefined,
    tabBarAccessibilityLabel: badge ? `${title}, ${badge} yeni` : title,
  };
}

function SearchButton() {
  const navigation = useNavigation();
  return <IconButton icon="search" label="Oyunçu axtar" bordered size={44} onPress={() => navigation.navigate("UserSearch")} />;
}

function LogoutButton() {
  const { logout } = useAuth();
  const { c } = useTheme();
  return (
    <IconButton
      icon="log-out-outline"
      label="Çıxış"
      color={c.red}
      bordered
      size={44}
      onPress={async () => {
        if (await confirm({ title: "Hesabdan çıxmaq istəyirsiniz?", confirmLabel: "Çıxış", destructive: true })) {
          await logout();
        }
      }}
    />
  );
}

function UserTabs() {
  const { unreadChatPeople, unreadCount } = useRealtime();
  return (
    <UserTab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ sceneStyle: { backgroundColor: "transparent" } }}>
      <UserTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          ...tabOptions("home-outline", "home", "Ana səhifə"),
          header: () => (
            <TopBar
              logo
              right={
                <>
                  <SearchButton />
                  <ThemeToggleButton />
                </>
              }
            />
          ),
        }}
      />
      <UserTab.Screen
        name="Sports"
        component={SportsScreen}
        options={{ ...tabOptions("football-outline", "football", "İdmanlar"), header: () => <TopBar logo right={<ThemeToggleButton />} /> }}
      />
      <UserTab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          ...tabOptions("chatbubble-outline", "chatbubble", "Chat", unreadChatPeople),
          header: () => <TopBar title="Dostlar" right={<SearchButton />} />,
        }}
      />
      <UserTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ ...tabOptions("notifications-outline", "notifications", "Bildirişlər", unreadCount), header: () => <TopBar title="Bildirişlər" /> }}
      />
      <UserTab.Screen
        name="Profile"
        component={MyProfileScreen}
        options={{
          ...tabOptions("person-outline", "person", "Profil"),
          header: () => (
            <TopBar
              title="Profilim"
              right={
                <>
                  <ThemeToggleButton />
                  <LogoutButton />
                </>
              }
            />
          ),
        }}
      />
    </UserTab.Navigator>
  );
}

/** Admins get the management area only, like the web (/admin blocks the user sports pages). */
function AdminTabs() {
  const { unreadCount } = useRealtime();
  const adminHeader = () => <TopBar logo badge="Admin" right={<ThemeToggleButton />} />;
  return (
    <AdminTab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ sceneStyle: { backgroundColor: "transparent" } }}>
      <AdminTab.Screen name="AdminLeagues" component={AdminLeaguesScreen} options={{ ...tabOptions("trophy-outline", "trophy", "Liqalar"), header: adminHeader }} />
      <AdminTab.Screen
        name="AdminChampionships"
        component={AdminChampionshipsScreen}
        options={{ ...tabOptions("medal-outline", "medal", "Çempionatlar"), header: adminHeader }}
      />
      <AdminTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ ...tabOptions("notifications-outline", "notifications", "Bildirişlər", unreadCount), header: () => <TopBar title="Bildirişlər" /> }}
      />
      <AdminTab.Screen name="Menu" component={AdminMenuScreen} options={{ ...tabOptions("menu-outline", "menu", "Menyu"), header: () => <TopBar title="Menyu" right={<ThemeToggleButton />} /> }} />
    </AdminTab.Navigator>
  );
}

export function RootNavigator() {
  const { status, isAdmin, retryRestore, logout } = useAuth();
  const { c } = useTheme();
  const styles = useStyles();

  const navTheme = useMemo<Theme>(() => {
    const base = c.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: c.brand, background: c.bg, card: c.bg, text: c.ink, border: c.border, notification: c.brand },
    };
  }, [c]);

  const stackOptions = useMemo<NativeStackNavigationOptions>(
    () => ({
      headerShadowVisible: false,
      headerStyle: { backgroundColor: c.bg },
      headerTintColor: c.ink,
      headerTitleStyle: { fontFamily: ff.displayBold, fontSize: 21, color: c.ink },
      headerBackButtonDisplayMode: "minimal",
      contentStyle: { backgroundColor: c.bg },
    }),
    [c],
  );

  if (status === "restoring") {
    return (
      <Screen edges={["top", "bottom"]}>
        <StatusBar style={c.isDark ? "light" : "dark"} />
        <View style={styles.splash}>
          <Logo size={34} />
          <LoadingView label="Sessiya bərpa olunur..." />
        </View>
      </Screen>
    );
  }

  if (status === "offline") {
    return (
      <Screen edges={["top", "bottom"]}>
        <StatusBar style={c.isDark ? "light" : "dark"} />
        <ErrorState message="Serverə qoşulmaq mümkün olmadı. İnternet bağlantınızı yoxlayın." onRetry={() => void retryRestore()} />
        <View style={{ alignItems: "center", paddingBottom: 32 }}>
          <Text style={styles.link} onPress={() => void logout()} accessibilityRole="button">
            Hesabdan çıx
          </Text>
        </View>
      </Screen>
    );
  }

  const mode = status === "guest" ? "guest" : isAdmin ? "admin" : "user";

  return (
    // Keyed by mode: switching guest/user/admin remounts with the right deep-link map.
    <NavigationContainer key={mode} theme={navTheme} linking={buildLinking(mode)}>
      <StatusBar style={c.isDark ? "light" : "dark"} />
      <Stack.Navigator screenOptions={stackOptions}>
        {mode === "guest" ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="GuestSports" component={SportsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Faq" component={FaqScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            {mode === "admin" ? (
              <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
            ) : (
              <Stack.Screen name="UserTabs" component={UserTabs} options={{ headerShown: false }} />
            )}
            <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{ title: "Komanda" }} />
            <Stack.Screen name="LeagueTeam" component={LeagueTeamScreen} options={{ title: "Komanda" }} />
            <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{ title: "Oyunçu" }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Profili redaktə et" }} />
            <Stack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: "Oyun" }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ title: "Haqqımızda" }} />
            <Stack.Screen name="Faq" component={FaqScreen} options={{ title: "FAQ" }} />
            {mode === "user" ? (
              <>
                <Stack.Screen name="Football" component={FootballScreen} options={{ title: "Futbol" }} />
                <Stack.Screen name="LeagueDetail" component={LeagueDetailScreen} options={{ title: "Liqa" }} />
                <Stack.Screen name="ChampionshipDetail" component={ChampionshipDetailScreen} options={{ title: "Çempionat" }} />
                <Stack.Screen name="UserSearch" component={UserSearchScreen} options={{ title: "Oyunçu axtar" }} />
                <Stack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: "Söhbət" }} />
              </>
            ) : (
              <>
                <Stack.Screen name="AdminLeagueDetail" component={AdminLeagueDetailScreen} options={{ title: "Liqa" }} />
                <Stack.Screen name="AdminChampionship" component={AdminChampionshipScreen} options={{ title: "Çempionat" }} />
                <Stack.Screen name="AdminMatch" component={AdminMatchScreen} options={{ title: "İdarəetmə" }} />
                <Stack.Screen name="AdminProfile" component={AdminProfileScreen} options={{ title: "Hesab" }} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const useStyles = makeStyles((c) => ({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  link: { color: c.textMuted, fontSize: font.sm, fontFamily: ff.bold, padding: 12 },
}));
