import { useMemo, useState } from "react";
import { Check, ChevronRight, Radio, RefreshCw, Trophy } from "lucide-react";
import {
  buildTournamentPath,
  type ChampionshipRoundState,
  type GroupRoundView,
  type TournamentStep,
} from "../../lib/championshipRounds";
import { STAGE_LABEL, formatChampWhen, venueOf } from "../../lib/championshipUi";
import { livePlayingMinute } from "../../lib/matchClock";
import { parsePlayoffNotes } from "../../lib/playoffBracket";
import type { ChampionshipListItem, GroupStandingsBlock } from "../../types/championship";
import type { Match } from "../../types/match";
import { TeamCrest } from "./ChampShared";
import { useLiveClock } from "./useLiveClock";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function stamp(iso: string | null | undefined): number {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function dayMonth(date: Date): string {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

function rangeLabel(matches: Match[]): string | null {
  const dates = matches
    .map((match) => (match.scheduledAt ? new Date(match.scheduledAt) : null))
    .filter((date): date is Date => date != null && !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());
  if (dates.length === 0) return null;
  const start = dates[0];
  const end = dates[dates.length - 1];
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return dayMonth(start);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${pad(start.getDate())}–${pad(end.getDate())}.${pad(start.getMonth() + 1)}`;
  }
  return `${dayMonth(start)} – ${dayMonth(end)}`;
}

function daysLeft(iso: string | null | undefined): string | null {
  const time = stamp(iso);
  if (!time || time <= Date.now()) return null;
  const days = Math.ceil((time - Date.now()) / 86_400_000);
  return days <= 1 ? "Bu gün" : `${days} gün qalıb`;
}

function stepLabel(step: TournamentStep): string {
  if (step.stage == null) return "Pley-off";
  return STAGE_LABEL[step.stage];
}

function finishedCount(matches: Match[]): number {
  return matches.filter((match) => match.status === "FINISHED").length;
}

function championName(matches: Match[]): string | null {
  const final = [...matches].reverse().find((match) => match.stage === "FINAL" && match.status === "FINISHED");
  if (!final) return null;
  if (final.winnerTeam?.name) return final.winnerTeam.name;
  if (final.homeScore > final.awayScore) return final.homeTeam.name;
  if (final.awayScore > final.homeScore) return final.awayTeam.name;
  return null;
}

function diffLabel(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function ChampionshipOverview({
  championship,
  matches,
  standings,
  roundState,
  groupViews,
  onOpenMatch,
  onOpenTab,
  onRefresh,
}: {
  championship: ChampionshipListItem;
  matches: Match[];
  standings: GroupStandingsBlock[];
  roundState: ChampionshipRoundState;
  groupViews: GroupRoundView[];
  onOpenMatch: (match: Match) => void;
  onOpenTab: (tab: "groups" | "playoff" | "matches") => void;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const steps = useMemo(
    () =>
      buildTournamentPath(matches, roundState, {
        hasGroups: championship.groups.length > 0,
        format: championship.format,
      }),
    [matches, roundState, championship.groups.length, championship.format],
  );
  const focus =
    steps.find((step) => step.status === "current") ??
    (roundState.phase === "finished" ? steps[steps.length - 1] : null) ??
    steps.find((step) => step.status === "upcoming") ??
    steps[steps.length - 1] ??
    null;
  const focusIndex = focus ? steps.findIndex((step) => step.key === focus.key) : -1;
  const nextStep = focusIndex >= 0 ? (steps[focusIndex + 1] ?? null) : null;
  const focusMatches = useMemo(() => {
    if (!focus) return [];
    const rows =
      focus.stage === "GROUP_STAGE"
        ? championship.groups.flatMap(
            (group) => groupViews.find((view) => view.groupId === group.id)?.current?.matches ?? [],
          )
        : focus.matches;
    const live = rows.filter((match) => match.status === "LIVE").sort((a, b) => stamp(a.scheduledAt) - stamp(b.scheduledAt));
    const rest = rows.filter((match) => match.status !== "LIVE").sort((a, b) => stamp(a.scheduledAt) - stamp(b.scheduledAt));
    return [...live, ...rest];
  }, [focus, championship.groups, groupViews]);
  const nowMs = useLiveClock(focusMatches.some((match) => match.status === "LIVE"));
  const recent = useMemo(
    () =>
      [...matches]
        .filter((match) => match.status === "FINISHED")
        .sort((left, right) => stamp(right.scheduledAt) - stamp(left.scheduledAt))
        .slice(0, 5),
    [matches],
  );
  const played = championship.progress?.finished ?? finishedCount(matches);
  const total = championship.progress?.total || championship.matchCount || matches.length;
  const finalMatch = matches.find((match) => match.stage === "FINAL");
  const finalWhen = finalMatch?.scheduledAt ?? championship.endDate;
  const champion = championName(matches);

  const refresh = () => {
    setRefreshing(true);
    void onRefresh().finally(() => setRefreshing(false));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold text-ink">Turnir yolu</h2>
          <p className="text-xs font-semibold text-slate-400">
            {played} / {total} oyun oynanılıb
          </p>
        </div>
        {steps.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Mərhələ hələ yoxdur.</p>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-[36rem] items-start">
              {steps.map((step, index) => {
                const current = step.key === focus?.key && step.status === "current";
                const done = step.status === "done";
                const dates = rangeLabel(step.matches);
                const count = step.matches.length > 0 ? `${finishedCount(step.matches)}/${step.matches.length} oyun` : null;
                return (
                  <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      <span className={`h-0.5 flex-1 ${index === 0 ? "bg-transparent" : steps[index - 1].status === "done" ? "bg-ink" : "bg-slate-200"}`} />
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                          done ? "bg-ink text-white" : current ? "bg-lime-300 text-ink ring-4 ring-lime-100" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className={`h-0.5 flex-1 ${index === steps.length - 1 ? "bg-transparent" : done ? "bg-ink" : "bg-slate-200"}`} />
                    </div>
                    <p className={`mt-2 text-center text-sm font-extrabold ${current || done ? "text-ink" : "text-slate-400"}`}>
                      {stepLabel(step)}
                    </p>
                    <p className="mt-0.5 text-center text-[11px] text-slate-400">{[dates, count].filter(Boolean).join(" · ") || "—"}</p>
                    {current ? (
                      <span className="mt-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">Cari mərhələ</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-ink">{focus ? stepLabel(focus) : "Cari mərhələ"}</h2>
            {focus?.status === "current" ? (
              <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[10px] font-black uppercase text-ink">Cari</span>
            ) : null}
            {(focus?.matches.length ?? 0) > 0 ? (
              <span className="text-xs font-semibold text-slate-400">
                {finishedCount(focus?.matches ?? [])} / {focus?.matches.length} oyun bitib
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenTab(focus?.stage === "GROUP_STAGE" ? "groups" : "playoff")}
              className="ml-auto inline-flex items-center text-sm font-semibold text-slate-500 hover:text-ink"
            >
              {focus?.stage === "GROUP_STAGE" ? "Qruplara bax" : "Pley-off cədvəli"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {champion && (focus?.stage === "FINAL" || roundState.phase === "finished") ? (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5 text-amber-900">
              <Trophy className="h-5 w-5" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide">Çempion</p>
                <p className="text-sm font-extrabold">{champion}</p>
              </div>
            </div>
          ) : null}

          {focusMatches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              {focus?.stage == null
                ? "Pley-off hələ başlamayıb."
                : roundState.groupStageComplete && focus.stage === "GROUP_STAGE"
                  ? "Qrup mərhələsi tamamlanıb."
                  : "Bu mərhələdə göstəriləcək oyun yoxdur."}
            </p>
          ) : (
            <div className="space-y-2">
              {focusMatches.map((match) => (
                <StageMatch
                  key={match.id}
                  match={match}
                  nowMs={nowMs}
                  stageLabel={focus ? stepLabel(focus) : ""}
                  refreshing={refreshing}
                  onOpen={() => onOpenMatch(match)}
                  onRefresh={refresh}
                />
              ))}
            </div>
          )}
          {nextStep ? <NextStage step={nextStep} onOpen={onOpenMatch} /> : null}
        </section>

        <aside className="space-y-3">
          
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-ink">Son nəticələr</h3>
              <button type="button" onClick={() => onOpenTab("matches")} className="text-xs font-semibold text-slate-400 hover:text-ink">
                Hamısı
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Hələ nəticə yoxdur.</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((match) => (
                  <li key={match.id}>
                    <button type="button" onClick={() => onOpenMatch(match)} className="w-full rounded-xl px-1 py-1.5 text-left hover:bg-slate-50">
                      <p className="text-[11px] text-slate-400">
                        {match.stage && match.stage !== "GROUP_STAGE" ? STAGE_LABEL[match.stage] : (match.group?.name ?? "Qrup")}
                        {match.scheduledAt ? ` · ${formatChampWhen(match.scheduledAt)}` : ""}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                        <span className="min-w-0 flex-1 truncate">{match.homeTeam.name}</span>
                        <span className="shrink-0 tabular-nums">{match.homeScore}:{match.awayScore}</span>
                        <span className="min-w-0 flex-1 truncate text-right">{match.awayTeam.name}</span>
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {standings.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-base font-extrabold text-ink">Qrup mərhələsi</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${roundState.groupStageComplete || roundState.phase !== "group" ? "bg-lime-100 text-lime-800" : "bg-sky-50 text-sky-700"}`}>
              {roundState.groupStageComplete || roundState.phase !== "group" ? "Tamamlandı" : "Davam edir"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-lime-400" />
              Pley-offa vəsiqə
            </span>
            <button type="button" onClick={() => onOpenTab("groups")} className="ml-auto text-sm font-semibold text-slate-500 hover:text-ink">
              Qruplara bax ›
            </button>
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(17rem,1fr))]">
            {standings.map((block) => {
              const qualify = block.qualifyCount ?? championship.defaultQualifyCount ?? 2;
              return (
                <article key={block.groupId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                    <h3 className="text-sm font-extrabold text-ink">{block.groupName}</h3>
                    <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <span className="w-6 text-center">O</span>
                      <span className="w-8 text-center">+/-</span>
                      <span className="w-8 text-center">Xal</span>
                    </div>
                  </div>
                  <ul>
                    {block.standings.map((row) => {
                      const qualifies = qualify > 0 && row.rank <= qualify;
                      return (
                        <li key={row.teamId} className={`flex items-center gap-2 px-3 py-2 ${qualifies ? "bg-lime-50" : "bg-white"}`}>
                          <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${qualifies ? "bg-lime-300 text-ink" : "bg-slate-100 text-slate-500"}`}>
                            {row.rank}
                          </span>
                          <TeamCrest name={row.team.name} logo={row.team.logo} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{row.team.name}</span>
                          <span className="w-6 text-center text-xs tabular-nums text-slate-500">{row.played}</span>
                          <span className={`w-8 text-center text-xs font-bold tabular-nums ${row.goalDiff > 0 ? "text-emerald-600" : row.goalDiff < 0 ? "text-rose-500" : "text-slate-400"}`}>
                            {diffLabel(row.goalDiff)}
                          </span>
                          <span className="w-8 text-center text-sm font-black tabular-nums text-ink">{row.points}</span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-lg font-black tabular-nums text-ink">{value}</p>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
    </div>
  );
}

function StageMatch({
  match,
  nowMs,
  stageLabel,
  refreshing,
  onOpen,
  onRefresh,
}: {
  match: Match;
  nowMs: number;
  stageLabel: string;
  refreshing: boolean;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const live = match.status === "LIVE";
  const minute = livePlayingMinute(match, nowMs);
  const meta = parsePlayoffNotes(match.notes);
  const played = match.status === "FINISHED" || live;

  if (live) {
    return (
      <article className="rounded-2xl border border-lime-300 bg-lime-50 px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 font-bold text-rose-600">
            <Radio className="h-3 w-3 animate-pulse" />
            Canlı{minute != null ? ` · ${minute}'` : ""}
          </span>
          <span className="font-semibold text-slate-500">{stageLabel}</span>
        </div>
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 text-left">
          <span className="w-[7.5rem] shrink-0 sm:w-36">
            <span className="block text-[11px] font-semibold leading-snug text-slate-600">{formatChampWhen(match.scheduledAt)}</span>
            {match.venue || match.location ? (
              <span className="mt-0.5 block truncate text-[11px] text-slate-400">{venueOf(match)}</span>
            ) : null}
          </span>
          <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Face name={match.homeTeam.name} logo={match.homeTeam.logo} hint={meta?.homeLabel} align="right" />
            <p className="text-3xl font-black tabular-nums text-ink">{match.homeScore} : {match.awayScore}</p>
            <Face name={match.awayTeam.name} logo={match.awayTeam.logo} hint={meta?.awayLabel} />
          </span>
        </button>
        <div className="mt-3 flex justify-center gap-2">
          <button type="button" onClick={onOpen} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-ink">
            Oyuna gir
          </button>
          <button type="button" disabled={refreshing} onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Hesabı yenilə
          </button>
        </div>
      </article>
    );
  }

  return (
    <button type="button" onClick={onOpen} className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50">
      <div className="w-36 shrink-0">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${match.status === "FINISHED" ? "bg-lime-100 text-lime-800" : "bg-slate-100 text-slate-500"}`}>
          {match.status === "FINISHED" ? "Bitib" : "Gözlənilir"}
        </span>
        <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-600">{formatChampWhen(match.scheduledAt)}</p>
        {match.venue || match.location ? (
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{venueOf(match)}</p>
        ) : null}
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Face name={match.homeTeam.name} logo={match.homeTeam.logo} hint={meta?.homeLabel ?? match.group?.name} align="right" />
        <p className={`text-center text-lg font-black tabular-nums ${played ? "text-ink" : "text-slate-300"}`}>
          {played ? `${match.homeScore} : ${match.awayScore}` : "vs"}
        </p>
        <Face name={match.awayTeam.name} logo={match.awayTeam.logo} hint={meta?.awayLabel} />
      </div>
    </button>
  );
}

function Face({
  name,
  logo,
  hint,
  align = "left",
}: {
  name: string;
  logo: string | null;
  hint?: string | null;
  align?: "left" | "right";
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <TeamCrest name={name} logo={logo} size="sm" />
        <span className="truncate text-sm font-extrabold text-ink">{name}</span>
      </div>
      {hint ? <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{hint}</p> : null}
    </div>
  );
}

function NextStage({ step, onOpen }: { step: TournamentStep; onOpen: (match: Match) => void }) {
  const upcoming = [...step.matches].sort((left, right) => stamp(left.scheduledAt) - stamp(right.scheduledAt)).slice(0, 2);
  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Növbəti mərhələ</p>
      {upcoming.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">{stepLabel(step)} hələ açılmayıb.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {upcoming.map((match) => {
            const meta = parsePlayoffNotes(match.notes);
            const left = daysLeft(match.scheduledAt);
            return (
              <li key={match.id}>
                <button type="button" onClick={() => onOpen(match)} className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50">
                  <div className="w-36 shrink-0">
                    <p className="text-sm font-extrabold text-ink">{stepLabel(step)}</p>
                    <p className="text-[11px] font-semibold leading-snug text-slate-600">{formatChampWhen(match.scheduledAt)}</p>
                    {match.venue || match.location ? (
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">{venueOf(match)}</p>
                    ) : null}
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <Face name={match.homeTeam.name} logo={match.homeTeam.logo} hint={meta?.homeLabel} align="right" />
                    <span className="text-xs font-bold text-slate-300">vs</span>
                    <Face name={match.awayTeam.name} logo={match.awayTeam.logo} hint={meta?.awayLabel} />
                  </div>
                  {left ? <span className="text-xs font-semibold text-slate-400">{left}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
