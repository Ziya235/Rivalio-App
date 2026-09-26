import type { MatchEvent, MatchEventType } from "../../../types/match";
import { EVENT_MINUTE_MAX, EVENT_MINUTE_MIN } from "./constants";

export function formatKickoff(iso: string | null | undefined): string {
  if (!iso) return "Vaxt təyin edilməyib";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Vaxt təyin edilməyib";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function playerName(
  player: { firstName: string; lastName: string; shirtNumber?: number | null } | null,
): string {
  if (!player) return "—";
  const num = player.shirtNumber != null ? `#${player.shirtNumber} ` : "";
  return `${num}${player.firstName} ${player.lastName}`.trim();
}

export function eventTitle(event: MatchEvent): string {
  switch (event.type) {
    case "GOAL":
      return "Qol";
    case "OWN_GOAL":
      return "Avtoqol";
    case "YELLOW_CARD":
      return "Sarı kart";
    case "RED_CARD":
      return "Qırmızı kart";
    case "SUBSTITUTION":
      return "Dəyişiklik";
    case "NOTE":
      return "Qeyd";
    default:
      return event.type;
  }
}

export function deleteEventPrompt(type: MatchEventType): string {
  switch (type) {
    case "GOAL":
    case "OWN_GOAL":
      return "Qolu silmək istədiyinizə əminsiniz?";
    case "YELLOW_CARD":
    case "RED_CARD":
      return "Kartı silmək istədiyinizə əminsiniz?";
    case "SUBSTITUTION":
      return "Dəyişikliyi silmək istədiyinizə əminsiniz?";
    case "NOTE":
      return "Qeydi silmək istədiyinizə əminsiniz?";
    default:
      return "Bu hadisəni silmək istədiyinizə əminsiniz?";
  }
}

export function roundedEventMinute(minute: number, second: number): number {
  const rounded = Math.round(minute + second / 60);
  return Math.min(EVENT_MINUTE_MAX, Math.max(EVENT_MINUTE_MIN, rounded));
}
