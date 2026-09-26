import { useMemo, useState, type ReactNode } from "react";
import { Crosshair, Radio } from "lucide-react";
import type { GroupRoundView } from "../../../../lib/championshipRounds";
import type { ChampionshipGroup } from "../../../../types/championship";
import type { Match } from "../../../../types/match";
import { useLiveClock } from "../hooks/useLiveClock";
import { FixtureRow } from "./FixtureRow";
import { GroupSelector, type GroupCardInfo } from "./GroupSelector";
import { GroupStandings } from "./GroupStandings";
import { RoundAccordion } from "./RoundAccordion";

function leaderName(matches: Match[]): string | null {
  const table = new Map<number, { name: string; points: number; diff: number; scored: number }>();
  const ensure = (id: number, name: string) => {
    const row = table.get(id) ?? { name, points: 0, diff: 0, scored: 0 };
    table.set(id, row);
    return row;
  };
  for (const match of matches) {
    ensure(match.homeTeamId, match.homeTeam.name);
    ensure(match.awayTeamId, match.awayTeam.name);
    if (match.status !== "FINISHED") continue;
    const home = ensure(match.homeTeamId, match.homeTeam.name);
    const away = ensure(match.awayTeamId, match.awayTeam.name);
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
  const ranked = [...table.values()].sort(
    (left, right) => right.points - left.points || right.diff - left.diff || right.scored - left.scored,
  );
  return ranked[0]?.name ?? null;
}

function cardFor(
  group: ChampionshipGroup,
  matches: Match[],
  view: GroupRoundView | undefined,
): GroupCardInfo {
  const groupMatches = matches.filter(
    (match) => match.groupId === group.id && (!match.stage || match.stage === "GROUP_STAGE"),
  );
  return {
    id: group.id,
    name: group.name,
    leader: leaderName(groupMatches),
    doneRounds: view?.rounds.filter((round) => round.status === "completed").length ?? 0,
    totalRounds: view?.rounds.length ?? 0,
  };
}

type GroupMatchView = "all" | "current" | "live";

export function ChampionshipGroups({
  groups,
  matches,
  groupViews,
  onSelect,
  onEnter,
  allowSchedule,
}: {
  groups: ChampionshipGroup[];
  matches: Match[];
  groupViews: GroupRoundView[];
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  allowSchedule: boolean;
}) {
  const [groupId, setGroupId] = useState<number | null>(groups[0]?.id ?? null);
  const [matchView, setMatchView] = useState<GroupMatchView>("current");
  const cards = useMemo(
    () =>
      groups.map((group) =>
        cardFor(
          group,
          matches,
          groupViews.find((item) => item.groupId === group.id),
        ),
      ),
    [groups, matches, groupViews],
  );
  const activeId = groups.some((group) => group.id === groupId) ? groupId : (groups[0]?.id ?? null);
  const activeGroup = groups.find((group) => group.id === activeId) ?? null;
  const view = groupViews.find((item) => item.groupId === activeId) ?? null;
  const liveMatches = (view?.rounds ?? [])
    .flatMap((round) => round.matches)
    .filter((match) => match.status === "LIVE");
  const nowMs = useLiveClock(liveMatches.length > 0);

  if (!activeGroup || activeId == null || !view) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
        Qrup yoxdur.
      </p>
    );
  }

  const pill = (id: GroupMatchView, label: string, extra?: ReactNode) => (
    <button
      type="button"
      onClick={() => setMatchView(id)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
        matchView === id
          ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {extra}
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <GroupSelector groups={groups} cards={cards} activeId={activeId} onSelect={setGroupId} />
      <div className="space-y-4">
        <GroupStandings
          groupId={activeId}
          groupName={activeGroup.name}
          qualifyCount={activeGroup.qualifyCount || 2}
          matches={matches}
        />
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {pill("all", "Bütün turlar")}
            {pill("current", "Cari tur", <Crosshair className="h-3.5 w-3.5" />)}
            {pill("live", "Canlı oyunlar", <Radio className="h-3.5 w-3.5 text-rose-500" />)}
          </div>
          {matchView === "all" ? (
            <RoundAccordion
              key={activeGroup.id}
              rounds={view.rounds}
              openKey={view.current?.key ?? view.rounds.at(-1)?.key ?? null}
              renderRound={(round) => (
                <ul className="divide-y divide-slate-100">
                  {round.matches.map((match) => (
                    <li key={match.id}>
                      <FixtureRow
                        match={match}
                        nowMs={nowMs}
                        onSelect={onSelect}
                        onEnter={onEnter}
                        allowSchedule={allowSchedule}
                      />
                    </li>
                  ))}
                </ul>
              )}
            />
          ) : null}
          {matchView === "current" ? (
            view.current ? (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cari tur</p>
                  <h3 className="text-base font-extrabold text-ink">{view.current.label}</h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  {view.current.matches.map((match) => (
                    <li key={match.id}>
                      <FixtureRow
                        match={match}
                        nowMs={nowMs}
                        onSelect={onSelect}
                        onEnter={onEnter}
                        allowSchedule={allowSchedule}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                {view.complete ? "Bu qrupun qrup mərhələsi tamamlanıb." : "Bu qrupda oyun yoxdur."}
              </p>
            )
          ) : null}
          {matchView === "live" ? (
            liveMatches.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                Hazırda canlı oyun yoxdur.
              </p>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {liveMatches.map((match) => (
                    <li key={match.id}>
                      <FixtureRow
                        match={match}
                        nowMs={nowMs}
                        onSelect={onSelect}
                        onEnter={onEnter}
                        allowSchedule={allowSchedule}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
