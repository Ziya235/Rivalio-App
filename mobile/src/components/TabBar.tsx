import { Pressable, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ff } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";

/**
 * Bottom navigation from the mockups: blurred bar, lime active colour and a small
 * lime indicator above the active tab, lime count badges.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = typeof options.title === "string" ? options.title : route.name;
        const color = focused ? c.brandInk : c.textFaint;
        const badge = options.tabBarBadge;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            style={styles.item}
          >
            {focused ? <View style={styles.indicator} /> : null}
            <View>
              {options.tabBarIcon?.({ focused, color, size: 23 })}
              {badge != null ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: {
    flexDirection: "row",
    backgroundColor: c.tabBar,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: "center", gap: 4, minHeight: 48 },
  indicator: { position: "absolute", top: -9, width: 22, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: c.brand },
  label: { fontSize: 10.5, fontFamily: ff.semibold },
  badge: {
    position: "absolute",
    top: -5,
    left: 14,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontFamily: ff.extrabold, color: c.onBrand },
}));
