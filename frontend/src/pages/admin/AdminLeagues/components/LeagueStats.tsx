import { Trophy, Users } from "lucide-react";
import { StatCard } from "../../../../components/admin/AdminModal";
import type { League } from "../../../../types/league";

function ShieldIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"
      />
    </svg>
  );
}

export function LeagueStats({ leagues }: { leagues: League[] }) {
  const publicCount = leagues.filter((league) => league.visibility === "PUBLIC").length;
  const teams = leagues.reduce((sum, league) => sum + league._count.teams, 0);

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <StatCard
        label="İctimai liqalar"
        value={publicCount}
        sub={`${leagues.length} cəmi`}
        icon={<Trophy className="h-4 w-4" />}
      />
      <StatCard
        label="Özəl liqalar"
        value={leagues.length - publicCount}
        sub="Yalnız sizin"
        icon={<ShieldIcon />}
      />
      <StatCard
        label="Komandalar"
        value={teams}
        sub="Bütün liqalarda"
        icon={<Users className="h-4 w-4" />}
      />
    </div>
  );
}
