import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Crosshair, Radio } from "lucide-react";
import { mediaUrl } from "../../../api/base";
import { formatMatchStamp } from "../../../lib/championshipUi";
import { livePlayingMinute } from "../../../lib/matchClock";
import {
  buildLeagueRounds,
  getCurrentRound,
  ROUND_STATUS_LABEL,
  type LeagueRoundGroup,
} from "../../../lib/leagueRounds";
import type { Match, MatchStatus } from "../../../types/match";

type MatchView = "all" | "live" | "current";

function statusBadgeClass(status: MatchStatus, light: boolean): string {
  if (light) {
    switch (status) {
      case "LIVE":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
      case "FINISHED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "CANCELLED":
      case "POSTPONED":
        return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
      default:
        return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    }
  }
  switch (status) {
    case "LIVE":
      return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
    case "FINISHED":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
    case "CANCELLED":
    case "POSTPONED":
      return "bg-white/5 text-white/40 ring-1 ring-white/10";
    default:
      return "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30";
  }
}

const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlı",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
  POSTPONED: "Təxirə",
};

function chipClass(round: LeagueRoundGroup, selected: boolean, light: boolean): string {
  if (selected) {
    return light
      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
      : "border-white bg-white text-gray-900 shadow-sm";
  }
  if (round.status === "completed") {
    return light
      ? "border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
      : "border-emerald-500/20 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25";
  }
  if (round.status === "current") {
    return light
      ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
      : "border-sky-400/30 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25";
  }
  return light
    ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10";
}

function RoundNavigation({
  rounds,
  activeKey,
  light,
  onSelect,
}: {
  rounds: LeagueRoundGroup[];
  activeKey: string;
  light: boolean;
  onSelect: (key: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeIndex = Math.max(
    0,
    rounds.findIndex((round) => round.key === activeKey),
  );
  const completedCount = rounds.filter((round) => round.status === "completed").length;
  const arrowClass = `inline-flex h-[4.25rem] w-16 shrink-0 items-center justify-center rounded-xl border disabled:cursor-not-allowed disabled:opacity-40 ${
    light
      ? "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
  }`;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const item = itemRefs.current[activeKey];
    if (!scroller || !item) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const delta =
      itemRect.left - scrollerRect.left - (scrollerRect.width - itemRect.width) / 2;
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeKey]);

  const selectByOffset = (offset: number) => {
    const next = rounds[activeIndex + offset];
    if (next) onSelect(next.key);
  };

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        aria-label="Əvvəlki tur"
        disabled={activeIndex <= 0}
        onClick={() => selectByOffset(-1)}
        className={arrowClass}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div ref={scrollerRef} className="min-w-0 flex-1 overflow-x-auto pb-0.5">
        <div className="inline-flex min-w-full flex-col">
          <div className="flex gap-2">
            {rounds.map((round) => {
              const selected = round.key === activeKey;
              return (
                <button
                  key={round.key}
                  type="button"
                  ref={(node) => {
                    itemRefs.current[round.key] = node;
                  }}
                  onClick={() => onSelect(round.key)}
                  title={ROUND_STATUS_LABEL[round.status]}
                  className={`flex h-[4.25rem] w-16 shrink-0 flex-col items-center justify-center rounded-xl border transition ${chipClass(round, selected, light)}`}
                >
                  <span className="text-[10px] font-semibold tracking-wide opacity-70">TUR</span>
                  <span className="text-lg font-bold leading-none tabular-nums">
                    {round.round ?? "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={`mt-3 h-1 w-full overflow-hidden rounded-full ${light ? "bg-gray-100" : "bg-white/10"}`}>
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{
                width: `${rounds.length === 0 ? 0 : (completedCount / rounds.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-label="Növbəti tur"
        disabled={activeIndex >= rounds.length - 1}
        onClick={() => selectByOffset(1)}
        className={arrowClass}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function MatchRow({
  match,
  light,
  onOpen,
  nowMs,
}: {
  match: Match;
  light: boolean;
  onOpen: (match: Match) => void;
  nowMs: number;
}) {
  const muted = light ? "text-gray-500" : "text-white/45";
  const soft = light ? "text-gray-600" : "text-white/70";
  const pending = match.status === "SCHEDULED" || match.status === "POSTPONED";
  const playingMinute = livePlayingMinute(match, nowMs);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(match)}
        className={`flex w-full cursor-pointer flex-col gap-3 px-4 py-4 text-left transition sm:flex-row sm:items-center sm:gap-4 ${
          light ? "hover:bg-gray-50/70" : "hover:bg-white/[0.03]"
        }`}
      >
        <div className={`flex w-full shrink-0 items-center gap-2 text-xs sm:w-44 sm:flex-col sm:items-start sm:gap-1 ${muted}`}>
          <span className={`inline-flex items-center gap-1 font-medium ${soft}`}>
            <Calendar className="h-3.5 w-3.5" />
            {formatMatchStamp(match.scheduledAt)}
          </span>
          <span className="truncate">{match.venue || "Meydan yoxdur"}</span>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamSide name={match.homeTeam.name} logo={match.homeTeam.logo} light={light} align="right" />
          <div className="min-w-[4.5rem] text-center">
            {pending ? (
              <span
                className={`inline-flex min-w-14 items-center justify-center rounded-lg border border-dashed px-2 py-1 text-sm font-bold tracking-wide ${
                  light ? "border-gray-200 text-gray-300" : "border-white/15 text-white/25"
                }`}
              >
                vs
              </span>
            ) : (
              <span
                className={`inline-flex min-w-14 items-center justify-center rounded-lg px-2 py-1 text-sm font-black tabular-nums ${
                  light ? "bg-gray-900 text-white" : "bg-white text-[#08080e]"
                }`}
              >
                {match.homeScore} : {match.awayScore}
              </span>
            )}
            {playingMinute != null ? (
              <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-500">
                <Radio className="h-3 w-3 animate-pulse" />
                {playingMinute}&apos;
              </span>
            ) : null}
          </div>
          <TeamSide name={match.awayTeam.name} logo={match.awayTeam.logo} light={light} />
        </div>
        <div className="flex items-center justify-end sm:w-28">
          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(match.status, light)}`}>
            {STATUS_LABEL[match.status]}
          </span>
        </div>
      </button>
    </li>
  );
}

function TeamSide({
  name,
  logo,
  light,
  align = "left",
}: {
  name: string;
  logo: string | null;
  light: boolean;
  align?: "left" | "right";
}) {
  const mark = logo ? (
    <img src={mediaUrl(logo)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        light ? "bg-emerald-50 text-emerald-600" : "bg-white/10 text-[#c5f135]"
      }`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );

  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {mark}
      <span className={`truncate font-semibold ${light ? "text-gray-900" : "text-white"}`}>{name}</span>
    </div>
  );
}

function statusTone(status: LeagueRoundGroup["status"], light: boolean): string {
  if (status === "completed") {
    return light ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-200";
  }
  if (status === "current") {
    return light ? "bg-sky-50 text-sky-700" : "bg-sky-500/15 text-sky-200";
  }
  return light ? "bg-gray-100 text-gray-500" : "bg-white/10 text-white/50";
}

function RoundCard({
  round,
  light,
  onOpen,
  nowMs,
}: {
  round: LeagueRoundGroup;
  light: boolean;
  onOpen: (match: Match) => void;
  nowMs: number;
}) {
  const card = light ? "border-gray-200 bg-white/70" : "border-white/10 bg-[#101017]";
  const border = light ? "border-gray-200" : "border-white/10";

  return (
    <section className={`overflow-hidden rounded-2xl border ${card}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${border}`}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-base font-bold ${light ? "text-gray-900" : "text-white"}`}>
              {round.label}
            </h3>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(round.status, light)}`}>
              {ROUND_STATUS_LABEL[round.status]}
            </span>
          </div>
          {round.dateLabel ? (
            <p className={`mt-0.5 text-xs ${light ? "text-gray-500" : "text-white/45"}`}>
              {round.dateLabel}
            </p>
          ) : null}
        </div>
        <span className={`text-xs font-semibold ${light ? "text-gray-400" : "text-white/40"}`}>
          {round.matches.length} oyun
        </span>
      </div>
      <ul className={`divide-y ${light ? "divide-gray-100" : "divide-white/5"}`}>
        {round.matches.map((match) => (
          <MatchRow key={match.id} match={match} light={light} onOpen={onOpen} nowMs={nowMs} />
        ))}
      </ul>
    </section>
  );
}

function EmptyMatches({ light, text }: { light: boolean; text: string }) {
  return (
    <section className={`overflow-hidden rounded-2xl border ${light ? "border-gray-200 bg-white/70" : "border-white/10 bg-[#101017]"}`}>
      <p className={`px-4 py-8 text-center text-sm ${light ? "text-gray-500" : "text-white/45"}`}>{text}</p>
    </section>
  );
}

export function LeagueMatches({
  leagueId,
  matches,
  light,
  onOpenMatch,
}: {
  leagueId: number;
  matches: Match[];
  light: boolean;
  onOpenMatch: (match: Match) => void;
}) {
  const [matchView, setMatchView] = useState<MatchView>("current");
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setMatchView("current");
    setPickedKey(null);
  }, [leagueId]);

  useEffect(() => {
    setFetchedAt(Date.now());
    setNowMs(Date.now());
  }, [matches]);

  const hasLive = matches.some((match) => match.status === "LIVE");
  useEffect(() => {
    if (!hasLive) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasLive]);

  const serverNow = matches.find((match) => match.serverNow)?.serverNow;
  const clockOffset = serverNow ? new Date(serverNow).getTime() - fetchedAt : 0;
  const alignedNow = nowMs + (Number.isNaN(clockOffset) ? 0 : clockOffset);

  const liveMatches = useMemo(
    () =>
      matches
        .filter((match) => match.status === "LIVE")
        .sort(
          (left, right) =>
            (left.round ?? Number.MAX_SAFE_INTEGER) -
              (right.round ?? Number.MAX_SAFE_INTEGER) || left.id - right.id,
        ),
    [matches],
  );
  const rounds = useMemo(() => buildLeagueRounds(matches), [matches]);
  const current = getCurrentRound(rounds);
  const active = rounds.find((round) => round.key === pickedKey) ?? current ?? null;
  const completedCount = rounds.filter((round) => round.status === "completed").length;

  const pillClass = (activePill: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
      activePill
        ? light
          ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
          : "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30"
        : light
          ? "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
          : "bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10"
    }`;

  return (
    <div className="space-y-4">
      <section className={`rounded-2xl border p-4 ${light ? "border-gray-200 bg-white/80" : "border-white/10 bg-[#101017]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMatchView("all")} className={pillClass(matchView === "all")}>
              Bütün turlar
            </button>
            <button type="button" onClick={() => setMatchView("live")} className={pillClass(matchView === "live")}>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Canlı
              {liveMatches.length > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                  {liveMatches.length}
                </span>
              ) : null}
            </button>
            <button type="button" onClick={() => setMatchView("current")} className={pillClass(matchView === "current")}>
              <Crosshair className="h-3.5 w-3.5" />
              Cari tur
            </button>
          </div>
          {rounds.length > 0 ? (
            <div className={`flex flex-wrap items-center gap-3 text-xs font-medium ${light ? "text-gray-500" : "text-white/50"}`}>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Tamamlanıb
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-sky-500" />
                Cari
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-[3px] border ${light ? "border-gray-300" : "border-white/30"}`} />
                Qarşıdadır
              </span>
              <span className={light ? "text-gray-400" : "text-white/35"}>
                {completedCount} / {rounds.length} tur
              </span>
            </div>
          ) : null}
        </div>

        {matchView === "current" && rounds.length > 0 && active ? (
          <div className="mt-4">
            <RoundNavigation
              rounds={rounds}
              activeKey={active.key}
              light={light}
              onSelect={setPickedKey}
            />
          </div>
        ) : null}
      </section>

      {matchView === "live" ? (
        liveMatches.length === 0 ? (
          <EmptyMatches light={light} text="Hazırda canlı oyun yoxdur." />
        ) : (
          <section className={`overflow-hidden rounded-2xl border ${light ? "border-gray-200 bg-white/70" : "border-white/10 bg-[#101017]"}`}>
            <ul className={`divide-y ${light ? "divide-gray-100" : "divide-white/5"}`}>
              {liveMatches.map((match) => (
                <MatchRow key={match.id} match={match} light={light} onOpen={onOpenMatch} nowMs={alignedNow} />
              ))}
            </ul>
          </section>
        )
      ) : rounds.length === 0 || !active ? (
        <EmptyMatches light={light} text="Bu liqada hələ oyun yoxdur." />
      ) : matchView === "all" ? (
        <div className="space-y-4">
          {rounds.map((round) => (
            <RoundCard key={round.key} round={round} light={light} onOpen={onOpenMatch} nowMs={alignedNow} />
          ))}
        </div>
      ) : (
        <RoundCard round={active} light={light} onOpen={onOpenMatch} nowMs={alignedNow} />
      )}
    </div>
  );
}
