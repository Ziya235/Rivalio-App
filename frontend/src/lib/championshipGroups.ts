export const GROUP_CHAMP_TEAM_MIN = 6;
export const GROUP_CHAMP_TEAM_MAX = 20;
export const GROUP_COUNT_MIN = 2;
export const GROUP_COUNT_MAX = 4;
export const GROUP_CAPACITY_MIN = 3;
export const GROUP_CAPACITY_MAX = 7;

export type SlotMode = "same" | "perGroup";

export function validateGroupSlots({
  teamCount,
  groupCount,
  slots,
  slotMode = "same",
}: {
  teamCount: number;
  groupCount: number;
  slots: Array<number | null | undefined>;
  slotMode?: SlotMode;
}): string | null {
  if (
    !Number.isInteger(groupCount) ||
    groupCount < GROUP_COUNT_MIN ||
    groupCount > GROUP_COUNT_MAX
  ) {
    return "Qrup sayı 2–4 aralığında olmalıdır.";
  }
  if (!Array.isArray(slots) || slots.length !== groupCount) {
    return "Hər qrup üçün tutum göstərilməlidir.";
  }

  for (const s of slots) {
    if (
      s == null ||
      !Number.isInteger(s) ||
      s < GROUP_CAPACITY_MIN ||
      s > GROUP_CAPACITY_MAX
    ) {
      return "Qrup tutumu 3–7 aralığında olmalıdır.";
    }
  }

  const totalSlots = slots.reduce<number>((sum, s) => sum + (s ?? 0), 0);
  const capacity = slots[0];
  const allSame = slots.every((s) => s === capacity);

  if (
    slotMode === "same" &&
    allSame &&
    capacity != null &&
    teamCount % capacity !== 0
  ) {
    return "Komanda sayı seçilmiş qrup tutumuna uyğun deyil.";
  }
  if (teamCount < totalSlots) {
    return "Komanda sayı qruplardakı ümumi slot sayından azdır.";
  }
  if (teamCount > totalSlots) {
    return "Komanda sayı seçilmiş qrup tutumuna uyğun deyil.";
  }
  return null;
}
