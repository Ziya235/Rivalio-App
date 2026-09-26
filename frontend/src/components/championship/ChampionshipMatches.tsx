import { groupRoundMatches, type ChampionshipRoundState } from "../../lib/championshipRounds";
import type { ChampionshipGroup } from "../../types/championship";
import type { Match } from "../../types/match";
import { PublicMatchLine } from "./PublicMatchLine";
import { RoundAccordion } from "./RoundAccordion";
import { useLiveClock } from "./useLiveClock";

export function ChampionshipMatches({
  groups,
  roundState,
  onOpenMatch,
}: {
  groups: ChampionshipGroup[];
  roundState: ChampionshipRoundState;
  onOpenMatch: (match: Match) => void;
}) {
  const hasLive = roundState.rounds.some((round) => round.matches.some((match) => match.status === "LIVE"));
  const nowMs = useLiveClock(hasLive);

  return (
    <RoundAccordion
      rounds={roundState.rounds}
      openKey={roundState.currentRound?.key ?? roundState.rounds.at(-1)?.key ?? null}
      renderRound={(round) => (
        <div className="divide-y divide-slate-100">
          {groupRoundMatches(round.matches, groups).map((section) => (
            <div key={section.groupId ?? "none"}>
              <p className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">{section.name}</p>
              <ul className="divide-y divide-slate-100">
                {section.matches.map((match) => (
                  <li key={match.id}>
                    <PublicMatchLine match={match} nowMs={nowMs} onOpen={onOpenMatch} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    />
  );
}
