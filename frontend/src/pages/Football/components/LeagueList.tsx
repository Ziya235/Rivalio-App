import { Check, Hourglass, Lock, Send, Trophy, X } from "lucide-react";
import { Badge, Button, SelectField } from "../../../components/ui";
import type { TeamSummary } from "../../../api/teams";
import type { League } from "../../../types/league";
import { LEAGUE_STATUS_LABEL } from "../constants";

export function LeagueList({
  light,
  items,
  emptyText,
  hint,
  isCaptain,
  joinTeamId,
  primaryCaptainTeamId,
  captainOptions,
  selectedJoinTeamId,
  myTeams,
  busy,
  joiningLeagueId,
  onJoinTeamChange,
  onOpen,
  onJoin,
  onCancel,
}: {
  light: boolean;
  items: League[];
  emptyText: string;
  hint: string;
  isCaptain: boolean;
  joinTeamId: string;
  primaryCaptainTeamId?: number;
  captainOptions: { label: string; value: string }[];
  selectedJoinTeamId: number;
  myTeams: TeamSummary[];
  busy: boolean;
  joiningLeagueId: number | null;
  onJoinTeamChange: (value: string) => void;
  onOpen: (league: League) => void;
  onJoin: (leagueId: number) => void;
  onCancel: (requestId: number) => void;
}) {
  const teamInLeague = (leagueId: number, teamId: number) =>
    myTeams.some(
      (team) =>
        team.id === teamId &&
        team.leagueMemberships?.some((m) => m.league.id === leagueId),
    );

  const pendingJoinFor = (league: League, teamId: number) =>
    league.myJoinRequests?.find(
      (request) => request.teamId === teamId && request.status === "PENDING",
    );

  return (
    <div className="mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <p className={`text-sm ${light ? "text-gray-500" : "text-white/45"}`}>
          {hint}
        </p>
        {isCaptain ? (
          <SelectField
            className="sm:w-56"
            value={joinTeamId || String(primaryCaptainTeamId || "")}
            onChange={onJoinTeamChange}
            options={captainOptions.filter((o) => o.value)}
            light={light}
          />
        ) : null}
      </div>

      {!isCaptain ? (
        <p className="text-xs text-amber-400/80 mb-4">
          Liqaya request göndərmək üçün komanda kapitanı olmalısınız
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className={`text-center py-10 ${light ? "text-gray-400" : "text-white/40"}`}>
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((l) => {
            const canView = l.canView !== false;
            const alreadyIn = selectedJoinTeamId
              ? teamInLeague(l.id, selectedJoinTeamId)
              : false;
            const pending = selectedJoinTeamId
              ? pendingJoinFor(l, selectedJoinTeamId)
              : undefined;
            const canRequest = isCaptain && l.status === "DRAFT" && !alreadyIn;
            return (
              <div
                key={l.id}
                className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-3 ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}
              >
                <button
                  type="button"
                  className="text-left min-w-0"
                  onClick={() => onOpen(l)}
                >
                  <h3
                    className={`font-semibold flex items-center gap-2 transition-colors ${
                      canView
                        ? light
                          ? "text-gray-900 hover:text-emerald-600"
                          : "text-white hover:text-[#c5f135]"
                        : light
                          ? "text-gray-500"
                          : "text-white/60"
                    }`}
                  >
                    <Trophy
                      size={16}
                      className={`shrink-0 ${light ? "text-emerald-500" : "text-[#c5f135]"}`}
                    />
                    {l.name}
                    {!canView ? (
                      <Lock
                        size={13}
                        className={light ? "text-gray-400" : "text-white/35"}
                      />
                    ) : null}
                    <Badge variant={l.visibility === "PUBLIC" ? "public" : "private"}>
                      {l.visibility === "PUBLIC" ? "Public" : "Private"}
                    </Badge>
                  </h3>
                  <div
                    className={`flex flex-wrap gap-3 text-xs mt-2 ${light ? "text-gray-400" : "text-white/45"}`}
                  >
                    {l.season ? <span>{l.season}</span> : null}
                    <span>{LEAGUE_STATUS_LABEL[l.status]}</span>
                    {l._count?.teams != null ? (
                      <span>{l._count.teams} komanda</span>
                    ) : null}
                  </div>
                  {l.description ? (
                    <p
                      className={`text-sm mt-2 line-clamp-2 ${light ? "text-gray-500" : "text-white/50"}`}
                    >
                      {l.description}
                    </p>
                  ) : null}
                </button>
                {alreadyIn ? (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      light
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    <Check size={13} />
                    Qoşulub
                  </span>
                ) : canRequest ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {pending ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          light
                            ? "border-amber-200 bg-amber-50 text-amber-600"
                            : "border-amber-400/25 bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        <Hourglass size={13} />
                        Gözləyir
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={
                        Boolean(pending) || (busy && joiningLeagueId === l.id)
                      }
                      onClick={() => void onJoin(l.id)}
                    >
                      <Send size={14} />
                      Request göndər
                    </Button>
                    {pending ? (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onClick={() => void onCancel(pending.id)}
                      >
                        <X size={14} />
                        Ləğv et
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
