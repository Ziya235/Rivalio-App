import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScrollScreen } from "../../components/Screen";
import { GuestMenuButton, ThemeToggleButton, TopBar } from "../../components/TopBar";
import { Title } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ff, spacing } from "../../theme";
import { makeStyles } from "../../theme/ThemeContext";
import { SportCard } from "./blocks";
import { SPORTS } from "./content";

/** Web /sports. Players open the football hub; visitors are sent to sign in first (like RequireUser). */
export function SportsScreen() {
  const navigation = useNavigation();
  const { status } = useAuth();
  const toast = useToast();
  const styles = useStyles();
  const guest = status === "guest";

  const open = () => {
    if (guest) {
      toast.info("Futbol bölməsi üçün daxil olun");
      navigation.navigate("Login");
    } else {
      navigation.navigate("Football");
    }
  };

  return (
    <ScrollScreen
      header={
        guest ? (
          <TopBar
            logo
            right={
              <>
                <ThemeToggleButton />
                <GuestMenuButton current="GuestSports" />
              </>
            }
          />
        ) : undefined
      }
    >
      <Title size={40}>İdman növləri</Title>
      <Text style={styles.lead}>Sevdiyin idmanı seç, oyunçuları tap, komandalar qur və rəqabətə qoşul.</Text>
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {SPORTS.map((sport) => (
          <SportCard key={sport.id} sport={sport} onPress={open} />
        ))}
      </View>
    </ScrollScreen>
  );
}

const useStyles = makeStyles((c) => ({
  lead: { fontFamily: ff.regular, fontSize: 13.5, lineHeight: 20, color: c.textMuted, marginTop: spacing.sm },
}));
