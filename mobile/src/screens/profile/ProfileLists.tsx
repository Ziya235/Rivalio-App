import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "../../components/states";
import { Card, IconTile, Pill, Row, TeamCrest } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { ff, font, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { Visibility } from "../../types/common";
import type { CompetitionPhase } from "../../utils/status";
import { PHASE_LABEL, PHASE_TONE, visibilityLabel } from "../../utils/status";

export type ProfileTeam = { id: number; name: string; logo: string | null; city?: string | null; badge?: string };
export type ProfileCompetition = {
  id: number;
  name: string;
  logo: string | null;
  visibility?: Visibility;
  phase: CompetitionPhase;
  kind: "league" | "championship";
};

export function TeamList({ teams, empty }: { teams: ProfileTeam[]; empty: string }) {
  const navigation = useNavigation();
  const { c } = useTheme();
  const styles = useStyles();
  if (teams.length === 0) return <EmptyState icon="shirt-outline" title={empty} />;
  return (
    <View style={{ gap: spacing.sm }}>
      {teams.map((t) => (
        <Card key={t.id} onPress={() => navigation.navigate("TeamDetail", { teamId: t.id })} accessibilityLabel={t.name}>
          <Row gap={spacing.md}>
            <TeamCrest name={t.name} logo={t.logo} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{t.name}</Text>
              {t.city ? <Text style={styles.sub}>{t.city}</Text> : null}
            </View>
            {t.badge ? <Pill label={t.badge} tone="lime" /> : <Ionicons name="chevron-forward" size={17} color={c.textFaint} />}
          </Row>
        </Card>
      ))}
    </View>
  );
}

export function CompetitionList({ items, empty }: { items: ProfileCompetition[]; empty: string }) {
  const navigation = useNavigation();
  const { isAdmin } = useAuth();
  const styles = useStyles();
  if (items.length === 0) return <EmptyState icon="trophy-outline" title={empty} />;
  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((item) => (
        <Card
          key={`${item.kind}-${item.id}`}
          accessibilityLabel={item.name}
          onPress={() => {
            if (item.kind === "league") navigation.navigate(isAdmin ? "AdminLeagueDetail" : "LeagueDetail", { leagueId: item.id });
            else if (isAdmin) navigation.navigate("AdminChampionship", { championshipId: item.id });
            else navigation.navigate("ChampionshipDetail", { championshipId: item.id });
          }}
        >
          <Row gap={spacing.md}>
            {item.logo ? (
              <TeamCrest name={item.name} logo={item.logo} size={42} />
            ) : (
              <IconTile icon={item.kind === "league" ? "trophy-outline" : "medal-outline"} tone={PHASE_TONE[item.phase]} size={42} />
            )}
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Row gap={6}>
                <Pill label={PHASE_LABEL[item.phase]} tone={PHASE_TONE[item.phase]} />
                {item.visibility ? <Pill label={visibilityLabel(item.visibility)} tone={item.visibility === "PUBLIC" ? "blue" : "violet"} /> : null}
              </Row>
            </View>
          </Row>
        </Card>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  name: { fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  sub: { fontSize: 12.5, fontFamily: ff.regular, color: c.textMuted, marginTop: 2 },
}));
