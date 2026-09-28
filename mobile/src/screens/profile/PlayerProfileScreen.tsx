import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { championshipsApi } from "../../api/championships";
import { playersApi, usersApi } from "../../api/people";
import { ChipBar } from "../../components/ChipBar";
import { ScrollScreen } from "../../components/Screen";
import { ErrorState, LoadingView } from "../../components/states";
import { Row, Stat } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "../../hooks/useQuery";
import type { RootScreenProps } from "../../navigation/types";
import { spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import { calcAge, formatDate } from "../../utils/format";
import { championshipPhase, leaguePhase } from "../../utils/status";
import { FriendActions } from "./FriendActions";
import { InfoRows, ProfileHero } from "./ProfileParts";
import { CompetitionList, TeamList } from "./ProfileLists";

type Tab = "info" | "teams" | "leagues" | "championships";

/** Another player's profile. Opened by Player id (roster) or by User id (search). */
export function PlayerProfileScreen({ route, navigation }: RootScreenProps<"PlayerProfile">) {
  const { playerId, userId } = route.params;
  const { user, isAdmin } = useAuth();
  const styles = useStyles();
  const [tab, setTab] = useState<Tab>("info");
  const key = playerId ? `player:${playerId}` : `user-profile:${userId}`;
  const query = useQuery(key, () => (playerId ? playersApi.get(playerId) : usersApi.profile(userId ?? 0)));
  const player = query.data;
  const teamIds = useMemo(() => new Set(player?.teams.map((t) => t.id) ?? []), [player]);
  const champs = useQuery(tab === "championships" && teamIds.size > 0 ? "championships:all" : null, () =>
    championshipsApi.list({ includeAll: true }),
  );

  const isSelf = Boolean(player?.userId && user?.id === player.userId);
  useEffect(() => {
    if (!isSelf) return;
    if (isAdmin) navigation.replace("AdminProfile");
    else navigation.replace("UserTabs", { screen: "Profile" });
  }, [isSelf, isAdmin, navigation]);

  useEffect(() => {
    if (player) navigation.setOptions({ title: `${player.firstName} ${player.lastName}` });
  }, [navigation, player]);

  if (query.loading) return <LoadingView />;
  if (query.error || !player) return <ErrorState error={query.error} message={query.error ? undefined : "Oyunçu tapılmadı"} onRetry={query.refresh} />;

  const name = `${player.firstName} ${player.lastName}`.trim();
  const age = calcAge(player.dateOfBirth);
  const championships = (champs.data ?? []).filter(
    (ch) => ch.teams?.some((t) => teamIds.has(t.teamId)) || ch.myTeams?.some((t) => teamIds.has(t.id)),
  );

  return (
    <ScrollScreen refreshing={query.refreshing} onRefresh={query.refresh} contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <View style={styles.pad}>
        <ProfileHero
          image={player.image}
          name={name}
          sub={[player.username ? `@${player.username}` : null, age != null ? `${age} yaş` : null].filter(Boolean).join(" · ")}
        >
          {/* Friends/chat are part of the player area only (the web admin area has neither). */}
          {player.userId && !isSelf && !isAdmin ? (
            <View style={{ marginTop: spacing.sm, alignSelf: "stretch" }}>
              <FriendActions userId={player.userId} />
            </View>
          ) : null}
          <Row style={{ alignSelf: "stretch", marginTop: spacing.md }}>
            <Stat label="Oyun" value={player.stats.gamesPlayed} />
            <Stat label="Qol" value={player.stats.goals} accent />
            <Stat label="Asist" value={player.stats.assists} />
          </Row>
        </ProfileHero>
      </View>
      <ChipBar
        items={[
          { key: "info", label: "Profil Məlumatları" },
          { key: "teams", label: "Komandalar" },
          { key: "leagues", label: "Liqalar" },
          { key: "championships", label: "Çempionatlar" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <View style={styles.pad}>
        {tab === "info" ? (
          <InfoRows
            rows={[
              ["Doğum tarixi", player.dateOfBirth ? formatDate(player.dateOfBirth) : null],
              ["İş yeri", player.workplace],
              ["Təhsil", player.school],
              ["Bio", player.description],
            ]}
          />
        ) : tab === "teams" ? (
          <TeamList teams={player.teams.map((t) => ({ ...t, badge: "Aktiv oyunçu" }))} empty="Komanda yoxdur" />
        ) : tab === "leagues" ? (
          <CompetitionList
            items={player.leagues.map((l) => ({ ...l, phase: leaguePhase(l.status), kind: "league" as const }))}
            empty="Liqa yoxdur"
          />
        ) : champs.loading ? (
          <LoadingView />
        ) : (
          <CompetitionList
            items={championships.map((ch) => ({
              id: ch.id,
              name: ch.name,
              logo: ch.logo,
              visibility: ch.visibility,
              phase: championshipPhase(ch.status),
              kind: "championship" as const,
            }))}
            empty="Çempionat yoxdur"
          />
        )}
      </View>
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  pad: { paddingHorizontal: spacing.lg },
}));
