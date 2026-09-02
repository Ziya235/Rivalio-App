import { MapPin } from "lucide-react";
import { parsePlayoffNotes } from "../../lib/playoffBracket";
import {
  formatChampWhen,
  MATCH_STATUS_LABEL,
  PLAYOFF_STAGES,
  playoffPlaceholders,
  STAGE_LABEL,
  venueOf,
  type PlayoffPlaceholder,
} from "../../lib/championshipUi";
import type { MatchStage } from "../../types/championship";
import type { Match } from "../../types/match";
import { ChampEmpty, TeamCrest } from "./ChampShared";

function matchStatusClass(status: Match["status"]) {
  if (status === "LIVE") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (status === "FINISHED") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
}

function PlayoffTeamSide({
  name,
  logo,
  winner,
  highlight,
  align = "left",
}: {
  name: string;
  logo: string | null;
  winner?: boolean;
  highlight?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""} ${
        winner || highlight ? "font-bold text-emerald-700" : "text-gray-800"
      }`}
    >
      <TeamCrest name={name} logo={logo} size="sm" />
      <span className="truncate text-xs sm:text-sm">{name}</span>
    </div>
  );
}

function PlayoffMatchCard({
  match,
  onOpen,
}: {
  match: Match;
  onOpen: (match: Match) => void;
}) {
  const meta = parsePlayoffNotes(match.notes);
  const isFinal = match.stage === "FINAL";
  const winnerId = match.status === "FINISHED" ? match.winnerTeamId : null;
  const scheduled = match.status === "SCHEDULED" || match.status === "POSTPONED";

  return (
    <button
      type="button"
      onClick={() => onOpen(match)}
      className={`w-full rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isFinal && winnerId
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-gray-400">
          {formatChampWhen(match.scheduledAt)}
        </span>
        <span
          className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${matchStatusClass(match.status)}`}
        >
          {MATCH_STATUS_LABEL[match.status]}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <PlayoffTeamSide
          name={match.homeTeam.name}
          logo={match.homeTeam.logo}
          winner={winnerId === match.homeTeamId}
          highlight={Boolean(isFinal && winnerId === match.homeTeamId)}
          align="right"
        />
        <div className="min-w-[3rem] text-center">
          {scheduled ? (
            <span className="text-sm font-bold tracking-wide text-gray-300">VS</span>
          ) : (
            <span className="font-display text-base font-black tabular-nums text-gray-900">
              {match.homeScore} - {match.awayScore}
            </span>
          )}
        </div>
        <PlayoffTeamSide
          name={match.awayTeam.name}
          logo={match.awayTeam.logo}
          winner={winnerId === match.awayTeamId}
          highlight={Boolean(isFinal && winnerId === match.awayTeamId)}
        />
      </div>
      {meta?.homeLabel || meta?.awayLabel ? (
        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          {meta.homeLabel ?? ""} vs {meta.awayLabel ?? ""}
        </p>
      ) : null}
      <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-gray-400">
        <MapPin size={11} />
        {venueOf(match)}
      </p>
      {isFinal && match.winnerTeam ? (
        <p className="mt-2 text-center text-xs font-bold text-amber-700">
          🏆 {match.winnerTeam.name}
        </p>
      ) : null}
    </button>
  );
}

function PlaceholderCard({ item }: { item: PlayoffPlaceholder }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-3">
      <p className="mb-2 text-[11px] font-medium text-gray-400">Gözlənilir</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className="truncate text-right text-xs font-semibold text-gray-500">
          {item.homeLabel}
        </p>
        <span className="text-sm font-bold text-gray-300">VS</span>
        <p className="truncate text-xs font-semibold text-gray-500">
          {item.awayLabel}
        </p>
      </div>
    </div>
  );
}

export function ChampionshipPlayoff({
  matches,
  onOpenMatch,
}: {
  matches: Match[];
  onOpenMatch: (match: Match) => void;
}) {
  const playoffMatches = matches.filter(
    (m) => m.stage && m.stage !== "GROUP_STAGE",
  );
  const byStage = new Map<MatchStage, Match[]>();
  for (const stage of PLAYOFF_STAGES) byStage.set(stage, []);
  for (const m of playoffMatches) {
    const stage = m.stage as MatchStage;
    if (byStage.has(stage)) byStage.get(stage)!.push(m);
  }
  for (const [stage, rows] of byStage) {
    rows.sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || a.id - b.id);
    byStage.set(stage, rows);
  }
  const placeholders = playoffPlaceholders(playoffMatches);
  const visible = PLAYOFF_STAGES.filter(
    (stage) =>
      (byStage.get(stage)?.length ?? 0) > 0 ||
      (placeholders.get(stage)?.length ?? 0) > 0,
  );

  if (visible.length === 0) {
    return (
      <ChampEmpty
        title="Playoff hələ başlamayıb"
        hint="Qrup mərhələsi bitəndən sonra bracket burada görünəcək."
      />
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-0 sm:px-0">
      <div className="flex min-w-max gap-4 pb-2">
        {visible.map((stage) => (
          <div key={stage} className="flex w-[17rem] shrink-0 flex-col sm:w-[18rem]">
            <div
              className={`mb-3 rounded-xl px-3 py-2 text-center text-sm font-bold shadow-sm ${
                stage === "FINAL"
                  ? "bg-amber-50 text-amber-800"
                  : stage === "SEMI_FINAL"
                    ? "bg-emerald-50 text-emerald-800"
                    : stage === "QUARTER_FINAL"
                      ? "bg-sky-50 text-sky-800"
                      : "bg-violet-50 text-violet-800"
              }`}
            >
              {STAGE_LABEL[stage]}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {(byStage.get(stage) ?? []).map((match) => (
                <PlayoffMatchCard
                  key={match.id}
                  match={match}
                  onOpen={onOpenMatch}
                />
              ))}
              {(placeholders.get(stage) ?? []).map((item) => (
                <PlaceholderCard key={item.key} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
