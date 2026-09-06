import { prisma } from "../config/db.js";

export const DEFAULT_SPORTS = [
  { name: "Football", code: "FOOTBALL", isEnabled: true },
  { name: "Basketball", code: "BASKETBALL", isEnabled: false },
  { name: "Tennis", code: "TENNIS", isEnabled: false },
  { name: "Volleyball", code: "VOLLEYBALL", isEnabled: false },
  { name: "Padel", code: "PADEL", isEnabled: false },
];

export async function ensureDefaultSports() {
  for (const sport of DEFAULT_SPORTS) {
    await prisma.sport.upsert({
      where: { code: sport.code },
      update: {},
      create: sport,
    });
  }
}

export async function getSportByCode(code) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  const defaults = DEFAULT_SPORTS.find((sport) => sport.code === normalized);

  if (defaults) {
    return prisma.sport.upsert({
      where: { code: defaults.code },
      update: {},
      create: defaults,
    });
  }

  return prisma.sport.findUnique({
    where: { code: normalized },
  });
}
