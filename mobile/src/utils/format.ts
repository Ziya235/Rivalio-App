const AZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avqust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 27.09.2026 */
export function formatDate(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "—";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** 18:30 */
export function formatTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "—";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 27.09.2026 18:30, or the "not scheduled" text used on the web. */
export function formatDateTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "Vaxt təyin edilməyib";
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/** 27 sentyabr 2026, 18:30 */
export function formatLongDateTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "Vaxt təyin edilməyib";
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${formatTime(iso)}`;
}

export function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]}`;
}

export function monthName(index: number): string {
  return AZ_MONTHS[index] ?? "";
}

/** "5 dəq əvvəl" style relative time for notifications / chat. */
export function formatRelative(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "indicə";
  if (minutes < 60) return `${minutes} dəq əvvəl`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün əvvəl`;
  return formatDate(iso);
}

export function formatLastSeen(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return "Son görülmə məlum deyil";
  return `Son görülmə: ${formatDateTime(iso)}`;
}

export function fullName(person?: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
} | null): string {
  if (!person) return "İstifadəçi";
  const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return name || person.username || "İstifadəçi";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatDiff(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function calcAge(dateOfBirth: string | null | undefined): number | null {
  const birth = parse(dateOfBirth);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** YYYY-MM-DD in local time, as the backend expects for dateOfBirth. */
export function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Azerbaijani ordinal suffix: 1-ci, 3-cü, 6-cı, 9-cu ... (from web lib/leagueRounds.ts). */
export function azOrdinal(value: number): string {
  const abs = Math.abs(Math.trunc(value));
  const last = abs % 10;
  const lastTwo = abs % 100;
  let suffix: "ci" | "cı" | "cu" | "cü" = "ci";
  if (lastTwo === 0) suffix = abs % 1000 === 0 ? "ci" : "cü";
  else if (last === 0) {
    const tens = Math.floor(lastTwo / 10);
    if (tens === 1 || tens === 3) suffix = "cu";
    else if (tens === 4 || tens === 6 || tens === 9) suffix = "cı";
  } else if (last === 3 || last === 4) suffix = "cü";
  else if (last === 6) suffix = "cı";
  else if (last === 9) suffix = "cu";
  return `${value}-${suffix}`;
}

export function roundLabel(round: number | null | undefined): string | null {
  if (round == null || !Number.isFinite(round) || round < 1) return null;
  return `${azOrdinal(round)} tur`;
}
