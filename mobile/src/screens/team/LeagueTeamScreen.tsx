import { useEffect } from "react";
import { Text, View } from "react-native";
import { leaguesApi } from "../../api/leagues";
import { ScrollScreen } from "../../components/Screen";
import { ErrorState, LoadingView } from "../../components/states";
import { Avatar, Row, SectionTitle, Stat, TeamCrest, Title } from "../../components/ui";
import { useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { cardShadow, ff, font, radius, spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import { azOrdinal } from "../../utils/format";

const FORM_TONE = { W: "#22C55E", D: "#94A3B8", L: "#EF4444" } as const;
const FORM_LABEL = { W: "Q", D: "H", L: "M" } as const;

/** A team in the context of one league (standings position, form, per-league player stats). Read-only. */
export function LeagueTeamScreen({ route, navigation }: RootScreenProps<"LeagueTeam">) {
  const { leagueId, teamId } = route.params;
  const styles = useStyles();
  const { data: team, loading, error, refresh, refreshing } = useQuery(`league:${leagueId}:team:${teamId}`, () =>
    leaguesApi.team(leagueId, teamId),
  );

  useEffect(() => {
    if (team) navigation.setOptions({ title: team.name });
  }, [navigation, team]);

  if (loading) return <LoadingView />;
  if (error || !team) return <ErrorState error={error} onRetry={refresh} />;

  return (
    <ScrollScreen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <TeamCrest name={team.name} logo={team.logo} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <Title size={26}>{team.name}</Title>
          <Text style={styles.sub}>
            {team.league.name}
            {team.stats.position ? ` · ${azOrdinal(team.stats.position)} yer` : ""}
          </Text>
          {team.form.length > 0 ? (
            <Row gap={4} style={{ marginTop: 4 }}>
              {team.form.map((f, i) => (
                <View key={i} style={[styles.form, { backgroundColor: FORM_TONE[f] }]}>
                  <Text style={styles.formText}>{FORM_LABEL[f]}</Text>
                </View>
              ))}
            </Row>
          ) : null}
        </View>
      </View>
      <Row style={{ marginTop: spacing.md }}>
        <Stat label="Oyun" value={team.stats.played} />
        <Stat label="Xal" value={team.stats.points} accent />
        <Stat label="Qol" value={`${team.stats.goalsFor}:${team.stats.goalsAgainst}`} />
      </Row>
      <SectionTitle count={team.players.length}>Oyunçular</SectionTitle>
      <View style={styles.table}>
        <Row style={styles.head}>
          <Text style={[styles.headText, { flex: 1 }]}>Oyunçu</Text>
          <Text style={[styles.headText, styles.num]}>Qol</Text>
          <Text style={[styles.headText, styles.num]}>Asist</Text>
        </Row>
        {team.players.map((p) => {
          const name = `${p.firstName} ${p.lastName}`.trim();
          return (
            <Row key={p.id} gap={spacing.md} style={styles.player}>
              <Avatar uri={p.photo} name={name} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName}>{name}</Text>
                <Text style={styles.sub}>{p.matchesPlayed} oyun</Text>
              </View>
              <Text style={[styles.stat, styles.num]}>{p.goals}</Text>
              <Text style={[styles.stat, styles.num, styles.dim]}>{p.assists}</Text>
            </Row>
          );
        })}
      </View>
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  sub: { fontSize: 12.5, fontFamily: ff.regular, color: c.textMuted },
  form: { width: 18, height: 18, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  formText: { color: "#FFFFFF", fontFamily: ff.extrabold, fontSize: 9.5 },
  table: { borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, ...cardShadow(c) },
  head: { minHeight: 36 },
  headText: { fontFamily: ff.bold, fontSize: 10.5, color: c.textFaint, letterSpacing: 0.5, textTransform: "uppercase" },
  player: { minHeight: 56, borderTopWidth: 1, borderTopColor: c.border },
  playerName: { fontSize: font.sm + 1, fontFamily: ff.bold, color: c.ink },
  num: { width: 44, textAlign: "center" },
  stat: { fontFamily: ff.extrabold, fontSize: 14, color: c.ink },
  dim: { color: c.textMuted, fontFamily: ff.bold },
}));
