import { MIN_MATCH_LEAD_MS } from "./constants";

export function toLocalInputValue(d = new Date(Date.now() + MIN_MATCH_LEAD_MS)) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isMatchTooSoon(localDatetime: string) {
  const when = new Date(localDatetime);
  if (Number.isNaN(when.getTime())) return true;
  return when.getTime() < Date.now() + MIN_MATCH_LEAD_MS;
}

export function formatMatchDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (Number.isNaN(d.getTime())) {
    return { date: "—", time: "—" };
  }
  return {
    date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
