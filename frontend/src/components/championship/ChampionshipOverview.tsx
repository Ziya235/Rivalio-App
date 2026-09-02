import { Handshake, MapPin, Target } from "lucide-react";
import {
  formatChampWhen,
  STAGE_LABEL,
  venueOf,
} from "../../lib/championshipUi";
import type {
  ChampionshipListItem,
  GroupStandingsBlock,
  PlayerStatistics,
  StandingRow,
} from "../../types/championship";
import type { Match } from "../../types/match";
import { TeamCrest } from "./ChampShared";

function SummaryCard({
  emoji,
  label,
  value,
  sub,
}: {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
      <p className="text-lg">{emoji}</p>
      <p className="mt-2 truncate font-display text-lg font-bold text-gray-900">
        {value}
      </p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p> : null}
    </div>
  );
}

function MiniMatch({
  title,
  match,
  empty,
}: {
  title: string;
  match: Match | null;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </p>
      {!match ? (
        <p className="mt-3 text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="mt-3">
          {match.stage ? (
            <p className="mb-2 text-[11px] font-semibold text-sky-600">
              {STAGE_LABEL[match.stage]}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">
                {match.homeTeam.name}
              </span>
              <TeamCrest name={match.homeTeam.name} logo={match.homeTeam.logo} size="sm" />
            </div>
            <span className="min-w-[3.5rem] text-center font-display text-lg font-black tabular-nums text-gray-900">
              {match.status === "SCHEDULED" || match.status === "POSTPONED"
                ? "VS"
                : `${match.homeScore} - ${match.awayScore}`}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TeamCrest name={match.awayTeam.name} logo={match.awayTeam.logo} size="sm" />
              <span className="truncate text-sm font-semibold text-gray-900">
                {match.awayTeam.name}
              </span>
            </div>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-gray-400">
            <MapPin size={11} />
            {venueOf(match)} · {formatChampWhen(match.scheduledAt)}
          </p>
        </div>
      )}
    </div>
  );
}

export function ChampionshipOverview({
  championship,
  matches,
  standings,
  statistics,
}: {
  championship: ChampionshipListItem;
  matches: Match[];
  standings: GroupStandingsBlock[];
  statistics: PlayerStatistics[];
}) {
  const myTeamIds = new Set((championship.myTeams ?? []).map((t) => t.id));
  const finished = matches.filter((m) => m.status === "FINISHED");
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED")
    .sort(
      (a, b) =>
        new Date(a.scheduledAt ?? 0).getTime() -
        new Date(b.scheduledAt ?? 0).getTime(),
    );
  const lastResult = [...finished].sort(
    (a, b) =>
      new Date(b.finishedAt ?? b.scheduledAt ?? 0).getTime() -
      new Date(a.finishedAt ?? a.scheduledAt ?? 0).getTime(),
  )[0] ?? null;
  const nextMatch = upcoming[0] ?? null;

  const finalMatch = finished.find((m) => m.stage === "FINAL");
  const champion = finalMatch?.winnerTeam ?? null;

  const topScorer = [...statistics]
    .filter((p) => p.goals > 0)
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        b.assists - a.assists ||
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "az"),
    )[0];
  const topAssister = [...statistics]
    .filter((p) => p.assists > 0)
    .sort(
      (a, b) =>
        b.assists - a.assists ||
        b.goals - a.goals ||
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "az"),
    )[0];

  const totalGoals = finished.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0);
  const isActive =
    championship.status === "GROUP_STAGE" || championship.status === "PLAYOFF";

  const myStanding: { teamName: string; groupName: string; row: StandingRow } | null =
    (() => {
      for (const block of standings) {
        const row = block.standings.find((s) => myTeamIds.has(s.teamId));
        if (row) {
          return {
            teamName: row.team.name,
            groupName: block.groupName,
            row,
          };
        }
      }
      return null;
    })();

  const myTeam = (championship.myTeams ?? [])[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          emoji="🏆"
          label="Çempion"
          value={champion?.name ?? "—"}
          sub={champion ? "Final qalibi" : "Hələ müəyyən olunmayıb"}
        />
        <SummaryCard
          emoji="⚽"
          label="Bombardir"
          value={
            topScorer
              ? `${topScorer.firstName} ${topScorer.lastName}`
              : "—"
          }
          sub={topScorer ? `${topScorer.goals} qol` : undefined}
        />
        <SummaryCard
          emoji="🎯"
          label="Ən çox assist"
          value={
            topAssister
              ? `${topAssister.firstName} ${topAssister.lastName}`
              : "—"
          }
          sub={topAssister ? `${topAssister.assists} asist` : undefined}
        />
        <SummaryCard
          emoji="🏟️"
          label="Oyun sayı"
          value={String(matches.length)}
        />
        <SummaryCard
          emoji="⚽"
          label="Ümumi qol sayı"
          value={String(totalGoals)}
        />
      </div>

      {isActive ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <MiniMatch
            title="Növbəti oyun"
            match={nextMatch}
            empty="Növbəti oyun yoxdur."
          />
          <MiniMatch
            title="Son nəticə"
            match={lastResult}
            empty="Hələ bitmiş oyun yoxdur."
          />
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Sizin komandanız
            </p>
            {myTeam ? (
              <div className="mt-3 flex items-center gap-3">
                <TeamCrest name={myTeam.name} logo={myTeam.logo} />
                <div>
                  <p className="font-semibold text-gray-900">{myTeam.name}</p>
                  <p className="text-xs text-emerald-600">İştirak edir</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">
                Bu çempionatda komandanız yoxdur.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Qrupdakı mövqeyi
            </p>
            {myStanding ? (
              <div className="mt-3">
                <p className="text-sm font-semibold text-gray-900">
                  {myStanding.groupName} · {myStanding.row.rank}-ci yer
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {myStanding.row.points} xal · {myStanding.row.played} oyun ·{" "}
                  {myStanding.row.goalDiff > 0 ? "+" : ""}
                  {myStanding.row.goalDiff} AV
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">
                Qrup cədvəli hələ yoxdur.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {(championship.myTeams ?? []).length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {(championship.myTeams ?? []).map((team) => (
            <span
              key={team.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
            >
              <TeamCrest name={team.name} logo={team.logo} size="sm" />
              {team.name}
            </span>
          ))}
        </div>
      ) : null}

      {statistics.length === 0 && matches.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Target size={14} />
          <Handshake size={14} />
          Statistika hələ toplanmayıb.
        </p>
      ) : null}
    </div>
  );
}
