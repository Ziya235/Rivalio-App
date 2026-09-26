import { ChevronRight, Pencil } from "lucide-react";
import { mediaUrl } from "../../../../api/base";
import { teamInitialTone } from "../../../../lib/teamAvatar";
import { parsePlayoffNotes } from "../../../../lib/playoffBracket";
import type { MatchStage } from "../../../../types/championship";
import type { Match } from "../../../../types/match";
import {
  MATCH_STATUS_LABEL,
  STAGE_COLUMN_CLASS,
  STAGE_LABEL,
} from "../constants";
import type { PlayoffPlaceholder } from "../constants";
import {
  canEditSchedule,
  formatCompactWhen,
  isFixtureReady,
  matchStatusClass,
} from "../helpers";

export function PlayoffTeamRow({
  name,
  logo,
  badge,
  align = "left",
}: {
  name: string;
  logo?: string | null;
  badge?: string | null;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {logo ? (
        <img src={mediaUrl(logo)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${teamInitialTone(name)}`}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        {badge ? (
          <p className="text-[11px] font-semibold text-slate-400">{badge}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PlayoffMatchCard({
  match,
  onSelect,
  onEnter,
  allowSchedule = true,
}: {
  match: Match;
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  allowSchedule?: boolean;
}) {
  const meta = parsePlayoffNotes(match.notes);
  const ready = isFixtureReady(match);
  const editable = allowSchedule && canEditSchedule(match);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-slate-500">
          {formatCompactWhen(match.scheduledAt)}
        </span>
        <span
          className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${matchStatusClass(
            match.status,
          )}`}
        >
          {match.status === "SCHEDULED" ? "Planlanıb" : MATCH_STATUS_LABEL[match.status]}
        </span>
      </div>
      <button
        type="button"
        onClick={() => (ready || !editable ? onEnter(match) : onSelect(match))}
        className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 text-left"
      >
        <PlayoffTeamRow
          name={match.homeTeam.name}
          logo={match.homeTeam.logo}
          badge={meta?.homeLabel}
          align="right"
        />
        <div className="min-w-[2.75rem] text-center">
          {match.status === "SCHEDULED" || match.status === "POSTPONED" ? (
            <span className="text-sm font-bold text-slate-300">vs</span>
          ) : (
            <span className="text-base font-black tabular-nums text-ink">
              {match.homeScore}:{match.awayScore}
            </span>
          )}
        </div>
        <PlayoffTeamRow
          name={match.awayTeam.name}
          logo={match.awayTeam.logo}
          badge={meta?.awayLabel}
        />
      </button>
      <div className="mt-2 flex items-center justify-end gap-1">
        {editable ? (
          <button
            type="button"
            onClick={() => onSelect(match)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-ink"
            title="Vaxt və məkan"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={!ready}
          onClick={() => onEnter(match)}
          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          title={ready ? "Oyuna gir" : "Əvvəlcə vaxt və məkan seçin"}
        >
          Oyuna gir
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function PlayoffPlaceholderCard({ item }: { item: PlayoffPlaceholder }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3">
      <p className="mb-2 text-[11px] font-medium text-slate-400">Gözlənilir</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className="truncate text-right text-xs font-semibold text-slate-500">
          {item.homeLabel}
        </p>
        <span className="text-sm font-bold text-slate-300">vs</span>
        <p className="truncate text-xs font-semibold text-slate-500">
          {item.awayLabel}
        </p>
      </div>
    </div>
  );
}

export function PlayoffStageColumn({
  stage,
  matches,
  placeholders,
  onSelect,
  onEnter,
  showConnector,
  allowSchedule = true,
}: {
  stage: MatchStage;
  matches: Match[];
  placeholders: PlayoffPlaceholder[];
  onSelect: (match: Match) => void;
  onEnter: (match: Match) => void;
  showConnector: boolean;
  allowSchedule?: boolean;
}) {
  return (
    <div className="flex w-[17rem] shrink-0">
      <div className="flex w-full flex-col">
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-center text-sm font-bold shadow-sm ${STAGE_COLUMN_CLASS[stage]}`}
        >
          {STAGE_LABEL[stage]}
        </div>
        <div className="flex flex-1 flex-col justify-around gap-3">
          {matches.map((match) => (
            <PlayoffMatchCard
              key={match.id}
              match={match}
              onSelect={onSelect}
              onEnter={onEnter}
              allowSchedule={allowSchedule}
            />
          ))}
          {placeholders.map((item) => (
            <PlayoffPlaceholderCard key={item.key} item={item} />
          ))}
        </div>
      </div>
      {showConnector ? (
        <div className="mx-1 hidden w-5 shrink-0 self-stretch sm:block" aria-hidden>
          <div className="mt-[2.6rem] h-[calc(100%-2.6rem)] w-full border-t border-r border-slate-200/90" />
        </div>
      ) : null}
    </div>
  );
}
