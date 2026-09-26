import { useEffect, useMemo, useState } from "react";
import { fetchGroupStandings } from "../../../../api/championships";
import type { StandingRow } from "../../../../types/championship";
import type { Match } from "../../../../types/match";
import { StandingsTable, type FormMark } from "./StandingsTable";

function playedAt(match: Match): number {
  if (!match.scheduledAt) return 0;
  const time = new Date(match.scheduledAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function recentForm(matches: Match[], teamId: number): FormMark[] {
  return matches
    .filter(
      (match) =>
        match.status === "FINISHED" &&
        (match.homeTeamId === teamId || match.awayTeamId === teamId),
    )
    .sort(
      (left, right) =>
        playedAt(left) - playedAt(right) ||
        (left.round ?? 0) - (right.round ?? 0) ||
        left.id - right.id,
    )
    .slice(-5)
    .map((match) => {
      const home = match.homeTeamId === teamId;
      const scored = home ? match.homeScore : match.awayScore;
      const conceded = home ? match.awayScore : match.homeScore;
      if (scored > conceded) return "Q";
      if (scored < conceded) return "M";
      return "H";
    });
}

export function GroupStandings({
  groupId,
  groupName,
  qualifyCount,
  matches,
}: {
  groupId: number;
  groupName: string;
  qualifyCount: number;
  matches: Match[];
}) {
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const groupMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.groupId === groupId && (!match.stage || match.stage === "GROUP_STAGE"),
      ),
    [matches, groupId],
  );
  const refreshKey = groupMatches
    .map((match) => `${match.id}:${match.status}:${match.homeScore}:${match.awayScore}`)
    .join("|");
  const formByTeam = useMemo(() => {
    const map: Record<number, FormMark[]> = {};
    for (const row of rows) map[row.teamId] = recentForm(groupMatches, row.teamId);
    return map;
  }, [rows, groupMatches]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGroupStandings(groupId)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, refreshKey]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h3 className="text-base font-extrabold text-ink">{groupName} — Cədvəl</h3>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <span className="h-2 w-2 rounded-full bg-lime-400" />
          Pley-offa vəsiqə
        </span>
      </div>
      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Cədvəl yüklənir...</p>
      ) : (
        <StandingsTable rows={rows} formByTeam={formByTeam} qualifyCount={qualifyCount} />
      )}
      <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
        O — oyun · Q — qələbə · H — heç-heçə · M — məğlubiyyət · Hər qrupdan ilk {qualifyCount}{" "}
        komanda pley-offa keçir
      </p>
    </section>
  );
}
