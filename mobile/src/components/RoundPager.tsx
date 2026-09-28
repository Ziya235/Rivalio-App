import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { display, ff, font, radius, spacing } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import type { Match } from "../types/match";
import { currentRoundIndex, ROUND_STATUS_LABEL, type RoundGroup } from "../utils/rounds";
import { IconButton } from "./ui";

/**
 * One round at a time with prev/next, starting at the current round
 * (the web's RoundNavigation, adapted for narrow screens).
 */
export function RoundPager({
  rounds,
  renderMatch,
}: {
  rounds: RoundGroup[];
  renderMatch: (match: Match) => React.ReactNode;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const [index, setIndex] = useState(() => currentRoundIndex(rounds));
  const roundCount = rounds.length;

  useEffect(() => {
    setIndex((i) => (i >= roundCount ? currentRoundIndex(rounds) : i));
    // Only reset when the number of rounds changes, not on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundCount]);

  const round = rounds[index];
  if (!round) return null;
  const current = round.status === "current";

  return (
    <View>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          label="Əvvəlki tur"
          bordered
          size={40}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          color={index === 0 ? c.textFaint : c.ink}
        />
        <View style={styles.center}>
          <Text style={styles.title}>{round.label}</Text>
          <Text style={[styles.status, current && styles.statusCurrent]}>
            {current ? "Cari tur" : ROUND_STATUS_LABEL[round.status]}
            {round.dateLabel ? ` · ${round.dateLabel}` : ""}
          </Text>
        </View>
        <IconButton
          icon="chevron-forward"
          label="Növbəti tur"
          bordered
          size={40}
          onPress={() => setIndex((i) => Math.min(roundCount - 1, i + 1))}
          color={index >= roundCount - 1 ? c.textFaint : c.ink}
        />
      </View>
      <View style={{ gap: spacing.md }}>
        {round.matches.map((match) => (
          <View key={match.id}>{renderMatch(match)}</View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  center: { flex: 1, alignItems: "center", gap: 2 },
  title: { ...display(20, "bold"), color: c.ink },
  status: { fontSize: font.xs, fontFamily: ff.medium, color: c.textMuted },
  statusCurrent: { color: c.brandInk, fontFamily: ff.semibold },
}));
