import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ApiError } from "../api/errors";
import { ff, font, radius, spacing } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import { Button, type IconName } from "./ui";

export function LoadingView({ label = "Yüklənir..." }: { label?: string }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.brand} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

/** Placeholder rows shown while a list loads for the first time. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  const styles = useStyles();
  return (
    <View style={{ gap: spacing.md, paddingVertical: spacing.sm }} accessibilityLabel="Yüklənir">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonAvatar} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.skeletonLine, { width: "60%" }]} />
            <View style={[styles.skeletonLine, { width: "35%" }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={26} color={c.textFaint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={[styles.muted, styles.centerText]}>{description}</Text> : null}
      {action ? <Button title={action.label} onPress={action.onPress} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}

export function ErrorState({
  error,
  message,
  onRetry,
}: {
  error?: ApiError | null;
  message?: string;
  onRetry?: () => void;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const icon: IconName =
    error?.kind === "network" || error?.kind === "timeout"
      ? "cloud-offline-outline"
      : error?.kind === "forbidden"
        ? "lock-closed-outline"
        : "alert-circle-outline";
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: c.redSoft }]}>
        <Ionicons name={icon} size={26} color={c.red} />
      </View>
      <Text style={[styles.title, styles.centerText]}>{message ?? error?.message ?? "Xəta baş verdi"}</Text>
      {onRetry && error?.kind !== "forbidden" && error?.kind !== "not_found" ? (
        <Button title="Yenidən cəhd et" icon="refresh" variant="outline" onPress={onRetry} style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.sm, minHeight: 240 },
  centerText: { textAlign: "center" },
  muted: { color: c.textMuted, fontSize: font.sm, fontFamily: ff.regular, lineHeight: 19 },
  title: { color: c.ink, fontSize: font.md, fontFamily: ff.bold, textAlign: "center" },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: c.cardMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  skeletonAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.cardMuted },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: c.cardMuted },
}));
