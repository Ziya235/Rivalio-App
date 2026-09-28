import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { spacing } from "../theme";
import { useTheme } from "../theme/ThemeContext";

/** Themed page background: flat #08080E (dark), the web gradient (light) or #F3F4F6 (admin light). */
export function Screen({
  children,
  edges = ["left", "right"],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {c.gradient ? (
        <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      <SafeAreaView edges={edges} style={[styles.root, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

/** Scrollable screen body with optional pull-to-refresh and keyboard handling. */
export function ScrollScreen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
  edges,
  keyboard,
  header,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  keyboard?: boolean;
  /** Fixed content above the scroll area (e.g. a custom top bar). */
  header?: ReactNode;
}) {
  const { c } = useTheme();
  const body = (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={c.brand} colors={[c.onBrand]} progressBackgroundColor={c.brand} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
  return (
    <Screen edges={edges}>
      {header}
      {keyboard ? (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Screen>
  );
}

/** Pull-to-refresh control in brand colours for FlatLists. */
export function useRefreshTint() {
  const { c } = useTheme();
  return { tintColor: c.brand, colors: [c.onBrand], progressBackgroundColor: c.brand };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: 0 },
});
