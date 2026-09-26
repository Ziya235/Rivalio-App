import {
  groupRoundMatches,
  type ChampionshipRound,
  type ChampionshipRoundState,
} from "../../../../lib/championshipRounds";
import type { ChampionshipGroup } from "../../../../types/championship";
import type { Match } from "../../../../types/match";
import { useLiveClock } from "../hooks/useLiveClock";
import { FixtureRow } from "./FixtureRow";
import { RoundAccordion } from "./RoundAccordion";

export function AllChampionshipMatches({
  groups,
  roundState,
  onSelect,
  onEnter,
  allowSchedule,
}: {
  groups: ChampionshipGroup[];
  roundState: ChampionshipRoundState;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  allowSchedule: boolean;
}) {
  const hasLive = roundState.rounds.some((round) =>
    round.matches.some((match) => match.status === "LIVE"),
  );
  const nowMs = useLiveClock(hasLive);

  return (
    <RoundAccordion
      rounds={roundState.rounds}
      openKey={roundState.currentRound?.key ?? roundState.rounds.at(-1)?.key ?? null}
      renderRound={(round) => (
        <RoundBody
          round={round}
          groups={groups}
          nowMs={nowMs}
          onSelect={onSelect}
          onEnter={onEnter}
          allowSchedule={allowSchedule}
        />
      )}
    />
  );
}

function RoundBody({
  round,
  groups,
  nowMs,
  onSelect,
  onEnter,
  allowSchedule,
}: {
  round: ChampionshipRound;
  groups: ChampionshipGroup[];
  nowMs: number;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  allowSchedule: boolean;
}) {
  const sections = groupRoundMatches(round.matches, groups);
  return (
    <div className="divide-y divide-slate-100">
      {sections.map((section) => (
        <div key={section.groupId ?? "none"}>
          <p className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {section.name}
          </p>
          <ul className="divide-y divide-slate-100">
            {section.matches.map((match) => (
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
        </div>
      ))}
    </div>
  );
}
