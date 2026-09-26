import type { MatchEventType } from "../../../types/match";

export const EVENT_MINUTE_MIN = 1;
export const EVENT_MINUTE_MAX = 180;

export const STATUS_LABEL = {
  SCHEDULED: "Planlaşdırılıb",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv edilib",
  POSTPONED: "Təxirə salınıb",
} as const;

export type EventModalKind = "GOAL" | "CARD" | "SUB" | "NOTE" | null;

export function eventKindFromType(type: MatchEventType): EventModalKind {
  if (type === "GOAL" || type === "OWN_GOAL") return "GOAL";
  if (type === "YELLOW_CARD" || type === "RED_CARD") return "CARD";
  if (type === "SUBSTITUTION") return "SUB";
  return "NOTE";
}
