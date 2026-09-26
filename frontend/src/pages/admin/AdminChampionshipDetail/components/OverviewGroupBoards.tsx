import { formatDiff } from "../helpers";
import type { ChampionshipGroup } from "../../../../types/championship";
import type { Match } from "../../../../types/match";
import { mediaUrl } from "../../../../api/base";
import { teamInitialTone } from "../../../../lib/teamAvatar";

type MiniRow = {
  teamId: number;
  name: string;
  logo: string | null;
  played: number;
  diff: number;
  points: number;
};

function isGroupMatch(match: Match): boolean {
  return !match.stage || match.stage === "GROUP_STAGE";
}

function standingsFor(group: ChampionshipGroup, matches: Match[]): MiniRow[] {
  const table = new Map<number, MiniRow & { scored: number }>();
  const ensure = (id: number, name: string, logo: string | null) => {
    const row = table.get(id) ?? { teamId: id, name, logo, played: 0, diff: 0, points: 0, scored: 0 };
    if (!row.logo && logo) row.logo = logo;
    table.set(id, row);
    return row;
  };

  for (const slot of group.teams) {
    ensure(slot.teamId, slot.team.name, slot.team.logo);
  }

  for (const match of matches) {
    if (match.groupId !== group.id || !isGroupMatch(match)) continue;
    const home = ensure(match.homeTeamId, match.homeTeam.name, match.homeTeam.logo);
    const away = ensure(match.awayTeamId, match.awayTeam.name, match.awayTeam.logo);
    if (match.status !== "FINISHED") continue;
    home.played += 1;
    away.played += 1;
    home.scored += match.homeScore;
    away.scored += match.awayScore;
    home.diff += match.homeScore - match.awayScore;
    away.diff += match.awayScore - match.homeScore;
    if (match.homeScore > match.awayScore) home.points += 3;
    else if (match.homeScore < match.awayScore) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }

  return [...table.values()]
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.diff - left.diff ||
        right.scored - left.scored ||
        left.name.localeCompare(right.name),
    )
    .map((row) => ({
      teamId: row.teamId,
      name: row.name,
      logo: row.logo,
      played: row.played,
      diff: row.diff,
      points: row.points,
    }));
}

function Mark({ name, logo }: { name: string; logo: string | null }) {
  if (logo) {
    return <img src={mediaUrl(logo)} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${teamInitialTone(name)}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function OverviewGroupBoards({
  groups,
  matches,
  complete,
  onOpenGroups,
}: {
  groups: ChampionshipGroup[];
  matches: Match[];
  complete: boolean;
  onOpenGroups: () => void;
}) {
  if (groups.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-base font-extrabold text-ink">Qrup mərhələsi</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            complete ? "bg-lime-100 text-lime-800" : "bg-sky-50 text-sky-700"
          }`}
        >
          {complete ? "Tamamlandı" : "Davam edir"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <span className="h-2 w-2 rounded-full bg-lime-400" />
          Pley-offa vəsiqə
        </span>
        <button
          type="button"
          onClick={onOpenGroups}
          className="ml-auto text-sm font-semibold text-slate-500 hover:text-ink"
        >
          Qruplara bax ›
        </button>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(17rem,1fr))]">
        {groups.map((group) => {
          const rows = standingsFor(group, matches);
          const qualifyCount = group.qualifyCount || 2;
          return (
            <article
              key={group.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <h3 className="text-sm font-extrabold text-ink">{group.name}</h3>
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <span className="w-6 text-center">O</span>
                  <span className="w-8 text-center">+/-</span>
                  <span className="w-8 text-center">Xal</span>
                </div>
              </div>
              <ul>
                {rows.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-slate-400">Komanda yoxdur</li>
                ) : (
                  rows.map((row, index) => {
                    const rank = index + 1;
                    const qualifies = rank <= qualifyCount;
                    return (
                      <li
                        key={row.teamId}
                        className={`flex items-center gap-2 px-3 py-2 ${
                          qualifies ? "bg-lime-50" : "bg-white"
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${
                            qualifies ? "bg-lime-300 text-ink" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {rank}
                        </span>
                        <Mark name={row.name} logo={row.logo} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                          {row.name}
                        </span>
                        <span className="w-6 text-center text-xs tabular-nums text-slate-500">
                          {row.played}
                        </span>
                        <span
                          className={`w-8 text-center text-xs font-bold tabular-nums ${
                            row.diff > 0 ? "text-emerald-600" : row.diff < 0 ? "text-rose-500" : "text-slate-400"
                          }`}
                        >
                          {formatDiff(row.diff)}
                        </span>
                        <span className="w-8 text-center text-sm font-black tabular-nums text-ink">
                          {row.points}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
