import { memo } from "react";
import { Text, View } from "react-native";
import { Avatar, Button, Card, Meta, Pill, Row, StatusPill, TeamCrest } from "../../components/ui";
import { SelectField } from "../../components/fields";
import { ff, font, radius, spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import type { Challenge, PlayerSearch } from "../../types/social";
import type { TeamSummary } from "../../types/team";
import { formatDate, formatTime, fullName } from "../../utils/format";

type Respond = (requestId: number, action: "accept" | "reject") => void;

function IncomingRequest({
  title,
  subtitle,
  image,
  busy,
  onAccept,
  onReject,
}: {
  title: string;
  subtitle: string;
  image: string | null | undefined;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.request}>
      <Avatar uri={image} name={title} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={styles.requestTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.requestSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Button title="Qəbul" size="sm" variant="success" icon="checkmark" onPress={onAccept} disabled={busy} />
      <Button title="Rədd" size="sm" variant="danger" icon="close" onPress={onReject} disabled={busy} />
    </View>
  );
}

/** "Oyun təklifi" card: host sees incoming requests, other captains can send one. */
export const ChallengeCard = memo(function ChallengeCard({
  challenge: c,
  userId,
  captainTeams,
  pickedTeamId,
  busy,
  respondingId,
  onOpenTeam,
  onPickTeam,
  onRequest,
  onCancelRequest,
  onRespond,
}: {
  challenge: Challenge;
  userId: number;
  captainTeams: TeamSummary[];
  pickedTeamId: number | null;
  busy: boolean;
  respondingId: number | null;
  onOpenTeam: (teamId: number) => void;
  onPickTeam: (challengeId: number, teamId: number) => void;
  onRequest: (challengeId: number, teamId: number) => void;
  onCancelRequest: (requestId: number) => void;
  onRespond: Respond;
}) {
  const styles = useStyles();
  const isHost = c.team.captainId === userId || c.createdById === userId;
  const pending = c.requests.filter((r) => r.status === "PENDING");
  const eligible = captainTeams.filter((t) => t.id !== c.teamId);
  const teamToUse = eligible.length === 1 ? eligible[0].id : pickedTeamId;

  return (
    <Card style={styles.card}>
      <Row>
        <TeamCrest name={c.team.name} logo={c.team.logo} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={styles.teamName} onPress={() => onOpenTeam(c.team.id)} accessibilityRole="link">
            {c.team.name}
          </Text>
          <Text style={styles.sub}>rəqib axtarır</Text>
        </View>
        {c.status === "ACCEPTED" ? <StatusPill tone="accepted" label="Rəqib tapıldı" /> : null}
      </Row>
      <View style={styles.metaWrap}>
        <Meta icon="calendar-outline" text={formatDate(c.scheduledAt)} />
        <Meta icon="time-outline" text={formatTime(c.scheduledAt)} />
        <Meta icon="location-outline" text={c.venue} />
      </View>
      {c.notes ? <Text style={styles.notes}>{c.notes}</Text> : null}

      {!isHost ? (
        c.myRequest?.status === "PENDING" ? (
          <Row style={styles.actions}>
            <StatusPill tone="pending" label="Gözləyir" />
            <Button title="Ləğv et" size="sm" variant="danger" icon="close" disabled={busy} onPress={() => onCancelRequest(c.myRequest!.id)} />
          </Row>
        ) : c.myRequest?.status === "ACCEPTED" || c.status === "ACCEPTED" ? (
          <View style={styles.actions}>
            <StatusPill tone="accepted" label="Qəbul edildi" />
          </View>
        ) : eligible.length > 0 ? (
          <View style={styles.actions}>
            {eligible.length > 1 ? (
              <SelectField
                label="Hansı komanda ilə?"
                value={pickedTeamId}
                options={eligible.map((t) => ({ label: t.name, value: t.id }))}
                onChange={(teamId) => onPickTeam(c.id, teamId)}
                placeholder="Komanda seçin"
              />
            ) : null}
            <Button
              title="Sorğu göndər"
              icon="send"
              size="sm"
              disabled={busy || !teamToUse || c.status !== "OPEN"}
              onPress={() => teamToUse && onRequest(c.id, teamToUse)}
            />
          </View>
        ) : null
      ) : (
        <View style={styles.hostBox}>
          {pending.length === 0 ? (
            <Text style={styles.sub}>{c.status === "ACCEPTED" ? "Rəqib komanda seçildi" : "Hələ sorğu yoxdur"}</Text>
          ) : (
            <>
              <Text style={styles.hostTitle}>Gələn sorğular · {pending.length}</Text>
              {pending.map((r) => (
                <IncomingRequest
                  key={r.id}
                  title={r.team.name}
                  subtitle={`${r.requestedBy ? `@${r.requestedBy.username} · ${fullName(r.requestedBy)}` : ""}${r.message ? ` · ${r.message}` : ""}`}
                  image={r.team.logo ?? r.requestedBy?.image}
                  busy={respondingId === r.id}
                  onAccept={() => onRespond(r.id, "accept")}
                  onReject={() => onRespond(r.id, "reject")}
                />
              ))}
            </>
          )}
        </View>
      )}
    </Card>
  );
});

/** "Oyunçu axtarışı" card: any player can ask to join; host captain answers. */
export const PlayerSearchCard = memo(function PlayerSearchCard({
  search: s,
  userId,
  busy,
  respondingId,
  onOpenTeam,
  onJoin,
  onCancelRequest,
  onRespond,
}: {
  search: PlayerSearch;
  userId: number;
  busy: boolean;
  respondingId: number | null;
  onOpenTeam: (teamId: number) => void;
  onJoin: (searchId: number) => void;
  onCancelRequest: (requestId: number) => void;
  onRespond: Respond;
}) {
  const styles = useStyles();
  const isHost = s.hostTeam.captainId === userId || s.createdById === userId;
  const pending = s.requests.filter((r) => r.status === "PENDING");
  return (
    <Card style={styles.card}>
      <Row>
        <TeamCrest name={s.hostTeam.name} logo={s.hostTeam.logo} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={styles.teamName} onPress={() => onOpenTeam(s.hostTeam.id)} accessibilityRole="link">
            {s.hostTeam.name}
          </Text>
          <Text style={styles.sub}>oyunçu axtarır</Text>
        </View>
        {s.status === "FULL" ? (
          <StatusPill tone="accepted" label="Oyunçular tapıldı" />
        ) : (
          <Pill label={`${s.spotsLeft} yer qalıb`} tone="violet" icon="person-add-outline" />
        )}
      </Row>
      <View style={styles.metaWrap}>
        <Meta icon="calendar-outline" text={formatDate(s.scheduledAt)} />
        <Meta icon="time-outline" text={formatTime(s.scheduledAt)} />
        <Meta icon="location-outline" text={s.venue} />
      </View>
      {s.notes ? <Text style={styles.notes}>{s.notes}</Text> : null}

      {!isHost ? (
        s.myRequest?.status === "PENDING" ? (
          <Row style={styles.actions}>
            <StatusPill tone="pending" label="Gözləyir" />
            <Button title="Ləğv et" size="sm" variant="danger" icon="close" disabled={busy} onPress={() => onCancelRequest(s.myRequest!.id)} />
          </Row>
        ) : s.myRequest?.status === "ACCEPTED" ? (
          <View style={styles.actions}>
            <StatusPill tone="accepted" label="Qəbul edildi" />
          </View>
        ) : (
          <View style={styles.actions}>
            <Button
              title={s.status === "FULL" ? "Sorğu qəbulu bağlanıb" : "Qoşulmaq istəyirəm"}
              icon="send"
              size="sm"
              disabled={busy || s.status !== "OPEN" || s.spotsLeft <= 0}
              onPress={() => onJoin(s.id)}
            />
          </View>
        )
      ) : (
        <View style={styles.hostBox}>
          {pending.length === 0 ? (
            <Text style={styles.sub}>{s.status === "FULL" ? "Çatışmayan oyunçular tamamlandı" : "Hələ sorğu yoxdur"}</Text>
          ) : (
            <>
              <Text style={styles.hostTitle}>Gələn sorğular · {pending.length}</Text>
              {pending.map((r) => (
                <IncomingRequest
                  key={r.id}
                  title={fullName(r.user)}
                  subtitle={`@${r.user.username}${r.message ? ` · ${r.message}` : ""}`}
                  image={r.user.image}
                  busy={respondingId === r.id}
                  onAccept={() => onRespond(r.id, "accept")}
                  onReject={() => onRespond(r.id, "reject")}
                />
              ))}
            </>
          )}
        </View>
      )}
    </Card>
  );
});

const useStyles = makeStyles((c) => ({
  card: { gap: 10 },
  teamName: { fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  sub: { fontSize: 12.5, fontFamily: ff.regular, color: c.textMuted },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, columnGap: 14 },
  notes: { fontSize: font.sm, fontFamily: ff.regular, color: c.text, lineHeight: 19 },
  actions: { marginTop: spacing.xs, gap: spacing.sm, alignItems: "flex-start" },
  hostBox: {
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: spacing.md,
  },
  hostTitle: { fontSize: 11, fontFamily: ff.bold, letterSpacing: 1.2, textTransform: "uppercase", color: c.textFaint },
  request: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap", borderRadius: radius.md },
  requestTitle: { fontSize: font.sm, fontFamily: ff.bold, color: c.ink },
  requestSub: { fontSize: font.xs, fontFamily: ff.regular, color: c.textMuted },
}));
