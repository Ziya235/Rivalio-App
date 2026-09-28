import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toApiError, type ApiError } from "../../api/errors";
import { usersApi } from "../../api/people";
import { Screen } from "../../components/Screen";
import { EmptyState, ErrorState } from "../../components/states";
import { Avatar, Card, Row, TextField } from "../../components/ui";
import { useDebouncedValue } from "../../hooks/timers";
import type { RootScreenProps } from "../../navigation/types";
import { ff, font, spacing } from "../../theme";
import { makeStyles, useTheme } from "../../theme/ThemeContext";
import type { UserSearchHit } from "../../types/player";
import { fullName } from "../../utils/format";

/** Player search by name or @username (debounced: the backend allows 60 searches/min). */
export function UserSearchScreen({ navigation }: RootScreenProps<"UserSearch">) {
  const { c } = useTheme();
  const styles = useStyles();
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q.trim(), 350);
  const [hits, setHits] = useState<UserSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!debounced) {
      setHits([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    usersApi
      .search(debounced, controller.signal)
      .then((result) => {
        setHits(result);
        setError(null);
      })
      .catch((err) => {
        const apiError = toApiError(err);
        if (apiError.kind !== "cancelled") setError(apiError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debounced]);

  return (
    <Screen>
      <View style={styles.searchBox}>
        <TextField
          value={q}
          onChangeText={setQ}
          icon="search"
          placeholder="Ad, soyad və ya @istifadəçi adı"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Oyunçu axtar"
        />
      </View>
      <FlatList
        data={hits}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          error ? (
            <ErrorState error={error} />
          ) : !debounced ? (
            <EmptyState icon="search-outline" title="Oyunçu axtar" description="Ad, soyad və ya istifadəçi adı ilə axtarın." />
          ) : loading ? null : (
            <EmptyState icon="person-outline" title="Heç kim tapılmadı" />
          )
        }
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate("PlayerProfile", { userId: item.id })} accessibilityLabel={fullName(item)}>
            <Row gap={spacing.md}>
              <Avatar uri={item.image} name={fullName(item)} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{fullName(item)}</Text>
                <Text style={styles.sub}>
                  @{item.username}
                  {item.teamName ? ` · ${item.teamName}` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={c.textFaint} />
            </Row>
          </Card>
        )}
      />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  searchBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0, flexGrow: 1 },
  name: { fontSize: font.md, fontFamily: ff.bold, color: c.ink },
  sub: { fontSize: 12.5, fontFamily: ff.regular, color: c.textMuted, marginTop: 2 },
}));
