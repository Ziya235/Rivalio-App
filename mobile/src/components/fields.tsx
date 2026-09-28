import { useState } from "react";
import { Alert, Image, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { PickedImage } from "../api/upload";
import { ff, font, radius, spacing, TOUCH_TARGET } from "../theme";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import { formatDate, formatDateTime } from "../utils/format";
import { BottomSheet } from "./BottomSheet";

// ───────── Option picker (native-feeling select) ─────────

export type Option<V extends string | number> = { label: string; value: V; description?: string; disabled?: boolean };

export function SelectField<V extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Seçin",
}: {
  label?: string;
  value: V | null;
  options: Option<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}: ${selected?.label ?? placeholder}`}
        style={styles.control}
      >
        <Text style={[styles.controlText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.textMuted} />
      </Pressable>
      <BottomSheet visible={open} title={label ?? placeholder} onClose={() => setOpen(false)}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              disabled={option.disabled}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: option.disabled }}
              style={[styles.option, active && styles.optionActive, option.disabled && { opacity: 0.45 }]}
            >
              <View style={[styles.radio, active && styles.radioActive]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>{option.label}</Text>
                {option.description ? <Text style={styles.optionDesc}>{option.description}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

/** Inline segmented choice for 2–5 options (visibility, format...). The active one is lime. */
export function SegmentedField<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: V;
  options: Option<V>[];
  onChange: (value: V) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.segment} accessibilityRole="radiogroup">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Large radio cards with a description (e.g. league format, championship format). */
export function OptionCards<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: V;
  options: Option<V>[];
  onChange: (value: V) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.optCard, active && styles.optCardActive]}
            >
              <View style={[styles.radio, active && styles.radioActive]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>{option.label}</Text>
                {option.description ? <Text style={styles.optionDesc}>{option.description}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={styles.switchRow}
    >
      <Text style={styles.switchText}>{label}</Text>
      <View style={[styles.switchTrack, value && styles.switchTrackOn]}>
        <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
      </View>
    </Pressable>
  );
}

// ───────── Date / time ─────────

/**
 * iOS: inline spinner inside a sheet. Android: the native dialogs (date, then
 * time for mode="datetime") because Android has no combined picker.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = "datetime",
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: Date | null;
  onChange: (value: Date) => void;
  mode?: "date" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? minimumDate ?? new Date());

  const openAndroid = () => {
    const base = value ?? minimumDate ?? new Date();
    DateTimePickerAndroid.open({
      value: base,
      mode: "date",
      minimumDate,
      maximumDate,
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (event.type !== "set" || !date) return;
        if (mode === "date") {
          onChange(date);
          return;
        }
        DateTimePickerAndroid.open({
          value: date,
          mode: "time",
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, time?: Date) => {
            if (timeEvent.type !== "set" || !time) return;
            const merged = new Date(date);
            merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(merged);
          },
        });
      },
    });
  };

  const open = () => {
    if (Platform.OS === "android") openAndroid();
    else {
      setDraft(value ?? minimumDate ?? new Date());
      setIosOpen(true);
    }
  };

  const text = value ? (mode === "date" ? formatDate(value.toISOString()) : formatDateTime(value.toISOString())) : "gg.aa.iiii";

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${label}: ${text}`} style={styles.control}>
        <Ionicons name={mode === "date" ? "calendar-outline" : "time-outline"} size={17} color={c.textMuted} />
        <Text style={[styles.controlText, !value && styles.placeholder]}>{text}</Text>
      </Pressable>
      {Platform.OS === "ios" ? (
        <BottomSheet
          visible={iosOpen}
          title={label}
          onClose={() => setIosOpen(false)}
          footer={
            <Pressable
              style={styles.done}
              accessibilityRole="button"
              onPress={() => {
                onChange(draft);
                setIosOpen(false);
              }}
            >
              <Text style={styles.doneText}>Təsdiqlə</Text>
            </Pressable>
          }
        >
          <DateTimePicker
            value={draft}
            mode={mode}
            display="spinner"
            locale="az-AZ"
            themeVariant={c.isDark ? "dark" : "light"}
            textColor={c.ink}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_event, date) => date && setDraft(date)}
          />
        </BottomSheet>
      ) : null}
    </View>
  );
}

// ───────── Image picker ─────────

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Opens the photo library; enforces the backend's 5MB image limit client-side. */
export async function pickImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("İcazə lazımdır", "Şəkil seçmək üçün qalereyaya giriş icazəsi verin.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
    Alert.alert("Şəkil çox böyükdür", "Şəkil maksimum 5MB ola bilər.");
    return null;
  }
  return { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName };
}

export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PickedImage | null;
  onChange: (image: PickedImage | null) => void;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const choose = async () => {
    const image = await pickImage();
    if (image) onChange(image);
  };
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.upload}>
        <Pressable onPress={() => void choose()} accessibilityRole="button" accessibilityLabel={value ? "Şəkli dəyiş" : "Şəkil seç"} style={styles.imageBox}>
          {value ? <Image source={{ uri: value.uri }} style={styles.image} /> : <Ionicons name="camera-outline" size={22} color={c.textMuted} />}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionText}>{value ? "Şəkil seçildi" : "Şəkil seçin"}</Text>
          <Text style={styles.optionDesc}>jpg, png, webp · maksimum 5MB</Text>
          {value ? (
            <Pressable onPress={() => onChange(null)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.remove}>Şəkli sil</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => void choose()} accessibilityRole="button" style={styles.uploadBtn}>
          <Text style={styles.uploadBtnText}>{value ? "Dəyiş" : "Şəkil seç"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ───────── Confirmation ─────────

export function confirm(options: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: "İmtina", style: "cancel", onPress: () => resolve(false) },
        {
          text: options.confirmLabel ?? "Təsdiqlə",
          style: options.destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

const useStyles = makeStyles((c) => ({
  field: { marginBottom: spacing.md },
  label: { fontSize: 12.5, fontFamily: ff.semibold, color: c.textMuted, marginBottom: 6 },
  control: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.input,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  controlText: { fontSize: font.md, fontFamily: ff.regular, color: c.ink, flex: 1 },
  placeholder: { color: c.textFaint },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  optionActive: { backgroundColor: c.brandSoft },
  optionText: { fontSize: font.md, color: c.ink, fontFamily: ff.semibold },
  optionDesc: { fontSize: 12, color: c.textMuted, marginTop: 2, fontFamily: ff.regular, lineHeight: 17 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.borderStrong },
  radioActive: { borderWidth: 5, borderColor: c.brand },
  optCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optCardActive: { borderColor: c.brand, backgroundColor: c.brandSoft },
  segment: {
    flexDirection: "row",
    backgroundColor: c.cardMuted,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segmentItem: { flex: 1, minHeight: 38, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  segmentItemActive: { backgroundColor: c.brand },
  segmentText: { fontSize: 13, fontFamily: ff.semibold, color: c.textMuted },
  segmentTextActive: { color: c.onBrand },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: TOUCH_TARGET, marginBottom: spacing.sm },
  switchText: { fontSize: font.md, fontFamily: ff.medium, color: c.text, flex: 1 },
  switchTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: c.cardMuted, borderWidth: 1, borderColor: c.borderStrong, justifyContent: "center" },
  switchTrackOn: { backgroundColor: c.brand, borderColor: c.brand },
  switchThumb: { width: 20, height: 20, borderRadius: 10, marginLeft: 2, backgroundColor: c.textFaint },
  switchThumbOn: { marginLeft: 20, backgroundColor: c.onBrand },
  done: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { fontFamily: ff.bold, color: c.onBrand, fontSize: font.md },
  upload: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: c.borderStrong,
    borderRadius: 14,
    padding: spacing.md,
  },
  imageBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: c.cardMuted,
  },
  image: { width: "100%", height: "100%" },
  uploadBtn: { height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.cardMuted, borderWidth: 1, borderColor: c.borderStrong, justifyContent: "center" },
  uploadBtnText: { fontFamily: ff.semibold, fontSize: 12.5, color: c.ink },
  remove: { color: c.red, fontFamily: ff.bold, marginTop: 4, fontSize: font.sm },
}));
