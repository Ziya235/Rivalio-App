import { mediaUrl } from "../../../../api/base";
import type { League } from "../../../../types/league";

export function LeagueAvatar({ league }: { league: League }) {
  if (league.logo) {
    return (
      <img
        src={mediaUrl(league.logo)}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
      {league.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
