import { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { adminChampionshipsApi } from "../../api/championships";
import { errorMessage } from "../../api/errors";
import { BottomSheet } from "../../components/BottomSheet";
import { OptionCards, SegmentedField } from "../../components/fields";
import { Screen, useRefreshTint } from "../../components/Screen";
import { EmptyState, ErrorState, SkeletonList } from "../../components/states";
import { Button, Card, IconTile, InfoBox, Pill, Row, TeamCrest, TextField } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { useQuery } from "../../hooks/useQuery";
import { ff, font, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { ChampionshipFormat } from "../../types/championship";
import type { MatchFormat, Visibility } from "../../types/common";
import { toDateOnly } from "../../utils/format";
import { championshipPhase, formatLabel, isSetupStatus, PHASE_LABEL, PHASE_TONE, STAGE_LABEL, visibilityLabel } from "../../utils/status";
import { AdminPageHeader, AdminStat, VISIBILITY_OPTIONS } from "./AdminLeaguesScreen";

export function AdminChampionshipsScreen() {
  const navigation = useNavigation();
  const { c } = useTheme();
  const styles = useStyles();
  const refreshTint = useRefreshTint();
  const [createOpen, setCreateOpen] = useState(false);
  const query = useQuery("admin:championships", () => adminChampionshipsApi.list());
  const rows = query.data ?? [];

  return (
    <Screen>
      <FlatList
        data={query.loading || query.error ? [] : rows}
        keyExtractor={(ch) => String(ch.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} {...refreshTint} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.md }}>
            <AdminPageHeader title="Çempionatlar" subtitle="Futbol çempionatlarını yaradın və qrup/playoff mərhələlərini idarə edin." />
            <Button title="Çempionat yarat" icon="add" onPress={() => setCreateOpen(true)} fullWidth />
            <Row gap={8} style={{ alignItems: "stretch" }}>
              <AdminStat icon="medal-outline" tone="lime" value={rows.length} label="Cəmi" />
              <AdminStat icon="radio-outline" tone="blue" value={rows.filter((ch) => championshipPhase(ch.status) === "ONGOING").length} label="Davam edir" />
              <AdminStat icon="flag-outline" tone="gray" value={rows.filter((ch) => championshipPhase(ch.status) === "FINISHED").length} label="Başa çatıb" />
            </Row>
          </View>
        }
        ListEmptyComponent={
          query.loading ? (
            <SkeletonList />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={query.refresh} />
          ) : (
            <EmptyState icon="trophy-outline" title="Çempionat yoxdur" />
          )
        }
        renderItem={({ item }) => {
          const phase = championshipPhase(item.status);
          const stage = item.currentStage ? STAGE_LABEL[item.currentStage] : item.status === "GROUP_STAGE" ? STAGE_LABEL.GROUP_STAGE : item.status === "PLAYOFF" ? "Pley-off" : null;
          return (
            <Card onPress={() => navigation.navigate("AdminChampionship", { championshipId: item.id })} accessibilityLabel={item.name}>
              <Row gap={spacing.md} style={{ alignItems: "flex-start" }}>
                {item.logo ? <TeamCrest name={item.name} logo={item.logo} size={42} /> : <IconTile icon="medal-outline" tone={PHASE_TONE[phase]} size={42} />}
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta}>
                    {formatLabel(item.format, item.matchFormat)} · {item.teamCount} komanda
                  </Text>
                  <Row gap={6} style={{ flexWrap: "wrap" }}>
                    <Pill label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} />
                    <Pill label={visibilityLabel(item.visibility)} tone={item.visibility === "PUBLIC" ? "blue" : "gray"} />
                    {stage ? <Pill label={stage} /> : null}
                  </Row>
                  {isSetupStatus(item.status) ? <Text style={styles.setup}>Qurulum →</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
              </Row>
            </Card>
          );
        }}
      />
      <CreateChampionshipSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          void query.reload();
          navigation.navigate("AdminChampionship", { championshipId: id });
        }}
      />
    </Screen>
  );
}

const PLAYOFF_TEAM_COUNTS = [
  { label: "4", value: "4" },
  { label: "8", value: "8" },
  { label: "16", value: "16" },
];

function CreateChampionshipSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<ChampionshipFormat>("GROUP_AND_PLAYOFF");
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("SINGLE");
  const [maxTeams, setMaxTeams] = useState("8");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName("");
    setDescription("");
    setFormat("GROUP_AND_PLAYOFF");
    setMatchFormat("SINGLE");
    setMaxTeams("8");
    setVisibility("PUBLIC");
    setError(null);
  }, [visible]);

  const submit = async () => {
    if (name.trim().length < 4) return setError("Çempionat adı ən azı 4 hərf olmalıdır");
    setBusy(true);
    setError(null);
    try {
      // Same payload the web admin sends (group format → up to 20 teams).
      const created = await adminChampionshipsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        format,
        matchFormat,
        maxTeams: format === "PLAYOFF_ONLY" ? Number(maxTeams) : 20,
        startDate: toDateOnly(new Date()),
        visibility,
        sportCode: "FOOTBALL",
      });
      toast.success("Çempionat yaradıldı");
      onCreated(created.id);
    } catch (err) {
      setError(errorMessage(err, "Yaradılmadı"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Yeni çempionat yarat"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button title="Ləğv et" variant="soft" onPress={onClose} disabled={busy} />
          <Button title="Yarat" loading={busy} onPress={() => void submit()} style={{ flex: 1 }} />
        </>
      }
    >
      <TextField label="Ad" required value={name} onChangeText={setName} maxLength={80} />
      <TextField label="Təsvir" value={description} onChangeText={setDescription} multiline maxLength={300} placeholder="Qısa təsvir" />
      <SegmentedField label="Görünürlük" value={visibility} options={VISIBILITY_OPTIONS} onChange={setVisibility} />
      <OptionCards
        label="Format"
        value={format}
        onChange={setFormat}
        options={[
          { label: "Qrup + Playoff", value: "GROUP_AND_PLAYOFF", description: "Əvvəl qrup mərhələsi, sonra playoff. Komandalar 6–20 aralığında əlavə olunur." },
          { label: "Yalnız Playoff", value: "PLAYOFF_ONLY", description: "Yalnız 4, 8 və ya 16 komanda. Başladıqda mərhələlər komanda sayına görə yaranır." },
        ]}
      />
      {format === "PLAYOFF_ONLY" ? (
        <SegmentedField label="Komanda sayı · 1/2, 1/4, 1/8 final" value={maxTeams} options={PLAYOFF_TEAM_COUNTS} onChange={setMaxTeams} />
      ) : null}
      <SegmentedField
        label="Oyun formatı"
        value={matchFormat}
        onChange={setMatchFormat}
        options={[
          { label: "1 oyun", value: "SINGLE" },
          { label: "Ev-səfər", value: "HOME_AWAY" },
        ]}
      />
      {error ? <InfoBox tone="red">{error}</InfoBox> : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) => ({
  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  name: { fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  meta: { fontSize: 12, fontFamily: ff.regular, color: c.textMuted },
  setup: { fontFamily: ff.semibold, fontSize: 12, color: c.brandInk, marginTop: 2 },
}));
