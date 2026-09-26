import { useMemo, useState } from "react";
import { Crosshair, Radio } from "lucide-react";
import type { GroupRoundView } from "../../lib/championshipRounds";
import type { ChampionshipGroup, GroupStandingsBlock } from "../../types/championship";
import type { Match } from "../../types/match";
import { ChampEmpty, TeamCrest } from "./ChampShared";
import { PublicMatchLine } from "./PublicMatchLine";
import { RoundAccordion } from "./RoundAccordion";
import { useLiveClock } from "./useLiveClock";

type FormMark = "Q" | "H" | "M";
type MatchView = "all" | "current" | "live";

const FORM_CLASS: Record<FormMark, string> = {
  Q: "bg-emerald-100 text-emerald-700",
  H: "bg-slate-100 text-slate-500",
  M: "bg-rose-100 text-rose-600",
};

function recentForm(matches: Match[], teamId: number): FormMark[] {
  return matches
    .filter(
      (match) =>
        match.status === "FINISHED" &&
        (match.homeTeamId === teamId || match.awayTeamId === teamId),
    )
    .sort((left, right) => {
      const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : 0;
      const rightTime = right.scheduledAt ? new Date(right.scheduledAt).getTime() : 0;
      return leftTime - rightTime || (left.round ?? 0) - (right.round ?? 0) || left.id - right.id;
    })
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

function diffLabel(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function ChampionshipGroups({
  groups,
  standings,
  matches,
  groupViews,
  myTeamIds,
  onOpenMatch,
}: {
  groups: ChampionshipGroup[];
  standings: GroupStandingsBlock[];
  matches: Match[];
  groupViews: GroupRoundView[];
  myTeamIds: Set<number>;
  onOpenMatch: (match: Match) => void;
}) {
  const [groupId, setGroupId] = useState<number | null>(groups[0]?.id ?? standings[0]?.groupId ?? null);
  const [matchView, setMatchView] = useState<MatchView>("current");
  const activeId = groups.some((group) => group.id === groupId)
    ? groupId
    : (groups[0]?.id ?? standings[0]?.groupId ?? null);
  const activeGroup = groups.find((group) => group.id === activeId) ?? null;
  const block = standings.find((item) => item.groupId === activeId) ?? null;
  const view = groupViews.find((item) => item.groupId === activeId) ?? null;
  const groupMatches = useMemo(
    () => matches.filter((match) => match.groupId === activeId && (!match.stage || match.stage === "GROUP_STAGE")),
    [matches, activeId],
  );
  const liveMatches = (view?.rounds ?? []).flatMap((round) => round.matches).filter((match) => match.status === "LIVE");
  const nowMs = useLiveClock(liveMatches.length > 0);
  const qualify = block?.qualifyCount ?? activeGroup?.qualifyCount ?? 2;

  if (!activeId || (!activeGroup && !block)) {
    return <ChampEmpty title="Qruplar hələ yoxdur" hint="Bu çempionatda qrup mərhələsi yoxdur və ya qruplar hələ hazır deyil." />;
  }

  const name = activeGroup?.name ?? block?.groupName ?? "Qrup";
  const cards = (groups.length > 0 ? groups : standings.map((item) => ({ id: item.groupId, name: item.groupName }))).map((group) => {
    const rows = standings.find((item) => item.groupId === group.id)?.standings ?? [];
    const progress = groupViews.find((item) => item.groupId === group.id);
    return {
      id: group.id,
      name: group.name,
      leader: rows[0]?.team.name ?? null,
      done: progress?.rounds.filter((round) => round.status === "completed").length ?? 0,
      total: progress?.rounds.length ?? 0,
    };
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <div className="flex w-max min-w-full gap-3">
          {cards.map((card) => {
            const selected = card.id === activeId;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setGroupId(card.id)}
                className={`flex min-w-[14rem] flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${
                  selected ? "border-lime-300 bg-lime-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-ink">{card.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">Lider: {card.leader ?? "—"}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${selected ? "bg-lime-200/80 text-lime-900" : "bg-slate-100 text-slate-500"}`}>
                  {card.total > 0 ? `${card.done}/${card.total} tur` : "0 tur"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h3 className="text-base font-extrabold text-ink">{name} — Cədvəl</h3>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-lime-400" />
            Pley-offa vəsiqə
          </span>
        </div>
        {!block || block.standings.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Cədvəl hələ boşdur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="w-10 px-3 py-2.5 text-center">#</th>
                  <th className="px-2 py-2.5">Komanda</th>
                  <th className="px-2 py-2.5 text-center">O</th>
                  <th className="px-2 py-2.5 text-center">Q</th>
                  <th className="px-2 py-2.5 text-center">H</th>
                  <th className="px-2 py-2.5 text-center">M</th>
                  <th className="px-2 py-2.5 text-center">Qol</th>
                  <th className="px-2 py-2.5 text-center">+/-</th>
                  <th className="px-3 py-2.5 text-center">Xal</th>
                  <th className="px-2 py-2.5 text-center">Forma</th>
                </tr>
              </thead>
              <tbody>
                {block.standings.map((row) => {
                  const form = recentForm(groupMatches, row.teamId);
                  const qualifies = qualify > 0 && row.rank <= qualify;
                  const mine = myTeamIds.has(row.teamId);
                  return (
                    <tr key={row.teamId} className={mine ? "bg-sky-50/70" : qualifies ? "bg-lime-50/40" : ""}>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${qualifies ? "bg-lime-300 text-ink" : "bg-slate-100 text-slate-500"}`}>
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-2">
                          <TeamCrest name={row.team.name} logo={row.team.logo} size="sm" />
                          <span className="truncate font-semibold text-ink">{row.team.name}</span>
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums text-slate-600">{row.played}</td>
                      <td className="px-2 py-3 text-center tabular-nums text-slate-600">{row.won}</td>
                      <td className="px-2 py-3 text-center tabular-nums text-slate-600">{row.drawn}</td>
                      <td className="px-2 py-3 text-center tabular-nums text-slate-600">{row.lost}</td>
                      <td className="px-2 py-3 text-center tabular-nums text-slate-700">{row.goalsFor}:{row.goalsAgainst}</td>
                      <td className={`px-2 py-3 text-center text-xs font-bold tabular-nums ${row.goalDiff > 0 ? "text-emerald-600" : row.goalDiff < 0 ? "text-rose-500" : "text-slate-400"}`}>
                        {diffLabel(row.goalDiff)}
                      </td>
                      <td className="px-3 py-3 text-center text-base font-black tabular-nums text-ink">{row.points}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {Array.from({ length: 5 }, (_, index) => {
                            const mark = form[index - (5 - form.length)];
                            if (!mark) return <span key={`${row.teamId}-e-${index}`} className="inline-flex h-5 w-5 rounded-md bg-slate-100" />;
                            return (
                              <span key={`${row.teamId}-${index}`} className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${FORM_CLASS[mark]}`}>
                                {mark}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
          O — oyun · Q — qələbə · H — heç-heçə · M — məğlubiyyət · Hər qrupdan ilk {qualify} komanda pley-offa keçir
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Bütün turlar"],
            ["current", "Cari tur"],
            ["live", "Canlı oyunlar"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMatchView(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ${
              matchView === id ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {id === "current" ? <Crosshair className="h-3.5 w-3.5" /> : null}
            {id === "live" ? <Radio className="h-3.5 w-3.5 text-rose-500" /> : null}
            {label}
          </button>
        ))}
      </div>

      {matchView === "all" ? (
        <RoundAccordion
          key={activeId}
          rounds={view?.rounds ?? []}
          openKey={view?.current?.key ?? view?.rounds.at(-1)?.key ?? null}
          renderRound={(round) => (
            <ul className="divide-y divide-slate-100">
              {round.matches.map((match) => (
                <li key={match.id}>
                  <PublicMatchLine match={match} nowMs={nowMs} onOpen={onOpenMatch} />
                </li>
              ))}
            </ul>
          )}
        />
      ) : null}

      {matchView === "current" ? (
        view?.current ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cari tur</p>
              <h3 className="text-base font-extrabold text-ink">{view.current.label}</h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {view.current.matches.map((match) => (
                <li key={match.id}>
                  <PublicMatchLine match={match} nowMs={nowMs} onOpen={onOpenMatch} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            {view?.complete ? "Bu qrupun qrup mərhələsi tamamlanıb." : "Bu qrupda oyun yoxdur."}
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
                  <PublicMatchLine match={match} nowMs={nowMs} onOpen={onOpenMatch} />
                </li>
              ))}
            </ul>
          </section>
        )
      ) : null}
    </div>
  );
}
