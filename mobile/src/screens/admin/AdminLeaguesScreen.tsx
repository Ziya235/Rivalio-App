import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../../api/errors";
import { adminLeaguesApi, leaguesApi } from "../../api/leagues";
import { uploadImage, type PickedImage } from "../../api/upload";
import { BottomSheet } from "../../components/BottomSheet";
import { ImageField, SegmentedField } from "../../components/fields";
import { Screen, useRefreshTint } from "../../components/Screen";
import { EmptyState, ErrorState, SkeletonList } from "../../components/states";
import { Button, Card, IconTile, InfoBox, Pill, Row, TeamCrest, TextField, Title, type IconName } from "../../components/ui";
import { useCurrentUser } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useQuery } from "../../hooks/useQuery";
import { cardShadow, display, ff, font, radius, spacing, type Tone } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { Visibility } from "../../types/common";
import { formatDate } from "../../utils/format";
import { leaguePhase, PHASE_LABEL, PHASE_TONE, visibilityLabel } from "../../utils/status";

export const VISIBILITY_OPTIONS = [
  { label: "İctimai", value: "PUBLIC" as Visibility },
  { label: "Özəl", value: "PRIVATE" as Visibility },
];

/** Admin page header: big condensed title and the web subtitle. */
export function AdminPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useStyles();
  return (
    <View style={{ gap: 6 }}>
      <Title size={30}>{title}</Title>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Stat card from the web admin (icon, number, label, sub line). */
export function AdminStat({ icon, tone, value, label, sub }: { icon: IconName; tone: Tone; value: number; label: string; sub?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <IconTile icon={icon} tone={tone} size={30} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

/** Only leagues this admin created (same filter as the web admin page). */
export function AdminLeaguesScreen() {
  const user = useCurrentUser();
  const navigation = useNavigation();
  const { c } = useTheme();
  const styles = useStyles();
  const refreshTint = useRefreshTint();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = useQuery("admin:leagues", () => leaguesApi.list());
  const leagues = useMemo(
    () => (query.data ?? []).filter((l) => l.sport.code === "FOOTBALL" && l.createdBy.id === user.id),
    [query.data, user.id],
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return leagues;
    return leagues.filter((l) => l.name.toLowerCase().includes(needle) || (l.season ?? "").toLowerCase().includes(needle) || (l.description ?? "").toLowerCase().includes(needle));
  }, [leagues, search]);
  const publicCount = leagues.filter((l) => l.visibility === "PUBLIC").length;
  const teamCount = leagues.reduce((sum, l) => sum + (l._count?.teams ?? 0), 0);

  return (
    <Screen>
      <FlatList
        data={query.loading || query.error ? [] : filtered}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} {...refreshTint} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.md }}>
            <AdminPageHeader
              title="Liqaların idarə olunması"
              subtitle="Yalnız sizin yaratdığınız liqalar burada görünür. Yeni ictimai və ya özəl liqa yarada bilərsiniz."
            />
            <Button title="Liqa yarat" icon="add" onPress={() => setCreateOpen(true)} fullWidth />
            <Row gap={8} style={{ alignItems: "stretch" }}>
              <AdminStat icon="trophy-outline" tone="lime" value={publicCount} label="İctimai liqalar" sub={`${leagues.length} cəmi`} />
              <AdminStat icon="shield-outline" tone="violet" value={leagues.length - publicCount} label="Özəl liqalar" sub="Yalnız sizin" />
              <AdminStat icon="people-outline" tone="blue" value={teamCount} label="Komandalar" sub="Bütün liqalarda" />
            </Row>
            <View>
              <Text style={styles.sectionTitle}>Mövcud liqalar</Text>
              <TextField icon="search" value={search} onChangeText={setSearch} placeholder="Axtarış..." accessibilityLabel="Liqa axtar" />
            </View>
          </View>
        }
        ListEmptyComponent={
          query.loading ? (
            <SkeletonList />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={query.refresh} />
          ) : (
            <EmptyState icon="trophy-outline" title={search.trim() ? `(${search.trim()}) liqa yoxdur` : "Hələ liqa yoxdur. \"Liqa yarat\" ilə başlayın."} />
          )
        }
        renderItem={({ item }) => {
          const phase = leaguePhase(item.status);
          return (
            <Card onPress={() => navigation.navigate("AdminLeagueDetail", { leagueId: item.id })} accessibilityLabel={item.name}>
              <Row gap={spacing.md}>
                {item.logo ? <TeamCrest name={item.name} logo={item.logo} size={42} /> : <IconTile icon="trophy-outline" tone={PHASE_TONE[phase]} size={42} />}
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta}>
                    {item._count.teams} komanda · {formatDate(item.createdAt)}
                  </Text>
                  <Row gap={6} style={{ flexWrap: "wrap" }}>
                    <Pill label={visibilityLabel(item.visibility)} tone={item.visibility === "PUBLIC" ? "blue" : "gray"} />
                    <Pill label={PHASE_LABEL[phase]} tone={PHASE_TONE[phase]} />
                  </Row>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
              </Row>
            </Card>
          );
        }}
      />
      <CreateLeagueSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void query.reload();
        }}
      />
    </Screen>
  );
}

function CreateLeagueSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [logo, setLogo] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName("");
    setDescription("");
    setVisibility("PUBLIC");
    setLogo(null);
    setError(null);
  }, [visible]);

  const submit = async () => {
    if (name.trim().length < 4) return setError("Liqa adı ən azı 4 hərf olmalıdır");
    setBusy(true);
    setError(null);
    try {
      const logoUrl = logo ? await uploadImage(logo) : undefined;
      await adminLeaguesApi.create({ name: name.trim(), description: description.trim() || undefined, visibility, logo: logoUrl });
      toast.success("Liqa yaradıldı");
      onCreated();
    } catch (err) {
      setError(errorMessage(err, "Liqa yaradılmadı"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Yeni liqa yarat"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button title="Ləğv et" variant="soft" onPress={onClose} disabled={busy} />
          <Button title="Yarat" loading={busy} onPress={() => void submit()} style={{ flex: 1 }} />
        </>
      }
    >
      <TextField
        label="Liqa adı"
        required
        value={name}
        onChangeText={setName}
        maxLength={80}
        placeholder="məs. Premier Liqa"
        error={name.trim().length > 0 && name.trim().length < 4 ? "Liqa adı ən azı 4 hərf olmalıdır" : null}
      />
      <TextField
        label="Açıqlama"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={300}
        placeholder="Qısa açıqlama yazın..."
        hint={`${description.length}/300`}
      />
      <SegmentedField label="Görünürlük" value={visibility} options={VISIBILITY_OPTIONS} onChange={setVisibility} />
      <ImageField label="Liqa şəkli" value={logo} onChange={setLogo} />
      {error ? <InfoBox tone="red">{error}</InfoBox> : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) => ({
  list: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  subtitle: { fontFamily: ff.regular, fontSize: 13.5, lineHeight: 20, color: c.textMuted },
  sectionTitle: { ...display(19, "bold"), color: c.ink, marginBottom: spacing.sm },
  stat: {
    flex: 1,
    gap: 4,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    ...cardShadow(c),
  },
  statValue: { ...display(26), lineHeight: 28, color: c.ink, marginTop: 6 },
  statLabel: { fontFamily: ff.semibold, fontSize: 11.5, color: c.textMuted, lineHeight: 15 },
  statSub: { fontFamily: ff.regular, fontSize: 10.5, color: c.textFaint },
  name: { fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  meta: { fontSize: 12, fontFamily: ff.regular, color: c.textMuted },
}));
