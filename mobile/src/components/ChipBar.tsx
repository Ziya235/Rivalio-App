import { ScrollView, View } from "react-native";
import { spacing } from "../theme";
import { makeStyles } from "../theme/ThemeContext";
import { Chip, type TabVariant } from "./ui";

export type ChipItem<K extends string> = { key: K; label: string; count?: number };

/**
 * Horizontally scrolling section switcher.
 * - "tabs": underlined tabs with a lime indicator (player screens)
 * - "pills": dark "ink" pills (admin screens, like the web admin)
 * - "chips": rounded filter chips
 */
export function ChipBar<K extends string>({
  items,
  active,
  onChange,
  variant = "tabs",
}: {
  items: ChipItem<K>[];
  active: K;
  onChange: (key: K) => void;
  variant?: TabVariant;
}) {
  const styles = useStyles();
  const tabs = variant === "tabs";
  return (
    <View style={tabs ? styles.tabsWrap : styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.bar, { gap: tabs ? 20 : spacing.sm }]}
        accessibilityRole="tablist"
        style={styles.scroll}
      >
        {items.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            count={item.count}
            active={item.key === active}
            variant={variant}
            onPress={() => onChange(item.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  scroll: { flexGrow: 0 },
  wrap: { paddingVertical: spacing.sm },
  tabsWrap: { borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: spacing.md },
  bar: { paddingHorizontal: spacing.lg },
}));
