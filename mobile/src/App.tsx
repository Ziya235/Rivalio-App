import { useEffect, type ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_900Black,
} from "@expo-google-fonts/barlow-condensed";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from "@expo-google-fonts/dm-sans";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { ToastProvider } from "./context/ToastContext";
import { RootNavigator } from "./navigation/RootNavigator";
import { ThemeProvider } from "./theme/ThemeContext";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Theme depends on the role: players default to dark, admins to the light panel. */
function ThemedApp({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  return <ThemeProvider role={isAdmin ? "admin" : "user"}>{children}</ThemeProvider>;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Fonts are bundled, so this only lasts a frame or two; the splash stays up meanwhile.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemedApp>
          <ToastProvider>
            <RealtimeProvider>
              <RootNavigator />
            </RealtimeProvider>
          </ToastProvider>
        </ThemedApp>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
