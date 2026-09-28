import type { ExpoConfig, ConfigContext } from "expo/config";

// APP_ENV / EXPO_PUBLIC_* values are read at bundle time. Nothing secret belongs here:
// everything in this config and in EXPO_PUBLIC_* ends up inside the app binary.
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === "production" ? "Rivalio" : `Rivalio (${APP_ENV})`,
  slug: "rivalio",
  scheme: "rivalio",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.rivalio.app",
    infoPlist: {
      // Development API servers usually run over plain http on the LAN.
      NSAppTransportSecurity:
        APP_ENV === "production" ? undefined : { NSAllowsArbitraryLoads: true },
    },
  },
  android: {
    package: "com.rivalio.app",
    adaptiveIcon: {
      backgroundColor: "#EAF8FF",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    [
      "expo-splash-screen",
      { image: "./assets/splash-icon.png", imageWidth: 180, resizeMode: "contain", backgroundColor: "#EAF8FF" },
    ],
    "expo-secure-store",
    "expo-status-bar",
    "@react-native-community/datetimepicker",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Rivalio profil və komanda şəkillərini seçmək üçün qalereyaya giriş istəyir.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  extra: {
    appEnv: APP_ENV,
  },
});
