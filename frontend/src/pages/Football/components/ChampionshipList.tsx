import { useMemo, useState } from "react";
import { Check, Hourglass, Lock, Send, Trophy, X } from "lucide-react";
import { Button, SelectField } from "../../../components/ui";
import type { TeamSummary } from "../../../api/teams";
import type { ChampionshipListItem } from "../../../types/championship";
import {
  championshipPhase,
  championshipStatusLabel,
  competitionPhaseBadgeClass,
  visibilityBadgeClass,
  visibilityLabel,
  type CompetitionPhase,
} from "../../../lib/competitionStatus";
import { JoinTeamModal } from "./JoinTeamModal";

const VISIBILITY_OPTIONS = [
  { label: "Hamısı", value: "" },
  { label: "İctimai", value: "PUBLIC" },
  { label: "Özəl", value: "PRIVATE" },
];

const STATUS_OPTIONS = [
  { label: "Hamısı", value: "" },
  { label: "Planlaşdırılır", value: "PLANNED" },
  { label: "Davam edir", value: "ONGOING" },
  { label: "Başa çatıb", value: "FINISHED" },
];

export function ChampionshipList({
  light,
  items,
  emptyText,
  hint,
  isCaptain,
  captainTeams,
  busy,
  joiningChampionshipId,
  onOpen,
  onJoin,
  onCancel,
}: {
  light: boolean;
  items: ChampionshipListItem[];
  emptyText: string;
  hint: string;
  isCaptain: boolean;
  captainTeams: TeamSummary[];
  busy: boolean;
  joiningChampionshipId: number | null;
  onOpen: (item: ChampionshipListItem) => void;
  onJoin: (championshipId: number, teamId: number) => void;
  onCancel: (requestId: number) => void;
}) {
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pick, setPick] = useState<{
    item: ChampionshipListItem;
    teams: TeamSummary[];
  } | null>(null);
  const [pickedTeamId, setPickedTeamId] = useState("");

  const teamInChampionship = (item: ChampionshipListItem, teamId: number) =>
    Boolean(
      item.teams?.some((row) => row.teamId === teamId) ||
        item.myTeams?.some((team) => team.id === teamId),
    );

  const pendingChampJoinFor = (item: ChampionshipListItem, teamId: number) =>
    item.myJoinRequests?.find(
      (request) => request.teamId === teamId && request.status === "PENDING",
    );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (visibilityFilter === "PUBLIC" && item.visibility !== "PUBLIC") return false;
      if (visibilityFilter === "PRIVATE" && item.visibility === "PUBLIC") return false;
      if (statusFilter && championshipPhase(item.status) !== (statusFilter as CompetitionPhase)) {
        return false;
      }
      return true;
    });
  }, [items, visibilityFilter, statusFilter]);

  const requestJoin = (item: ChampionshipListItem, teams: TeamSummary[]) => {
    if (captainTeams.length <= 1) {
      const team = teams[0] ?? captainTeams[0];
      if (team) onJoin(item.id, team.id);
      return;
    }
    setPickedTeamId(String(teams[0]?.id ?? ""));
    setPick({ item, teams });
  };

  return (
    <div className="mt-6">
      <p className={`mb-3 text-sm ${light ? "text-gray-500" : "text-white/45"}`}>{hint}</p>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          label="Çempionat növü"
          value={visibilityFilter}
          onChange={setVisibilityFilter}
          options={VISIBILITY_OPTIONS}
          light={light}
        />
        <SelectField
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          light={light}
        />
      </div>

      <p className={`mb-4 text-sm ${light ? "text-gray-500" : "text-white/50"}`}>
        Çempionatda iştirak etmək üçün dəvət göndərin.
      </p>
      {!isCaptain ? (
        <p className="mb-4 text-xs text-amber-400/80">
          Çempionata dəvət göndərmək üçün komanda kapitanı olmalısınız
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className={`py-10 text-center ${light ? "text-gray-400" : "text-white/40"}`}>
          {emptyText}
        </p>
      ) : filtered.length === 0 ? (
        <p className={`py-10 text-center ${light ? "text-gray-400" : "text-white/40"}`}>
          Filtrə uyğun çempionat yoxdur
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const canView = item.canView !== false;
            const rows = captainTeams.map((team) => ({
              team,
              joined: teamInChampionship(item, team.id),
              pending: pendingChampJoinFor(item, team.id),
            }));
            const available = rows.filter((row) => !row.joined && !row.pending).map((row) => row.team);
            const pendingRows = rows.filter((row) => row.pending);
            const anyJoined = rows.some((row) => row.joined);
            const canRequest =
              isCaptain &&
              item.status === "DRAFT" &&
              !anyJoined &&
              pendingRows.length === 0 &&
              available.length > 0;

            return (
              <div
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5 ${light ? "border-gray-200 bg-white/70 backdrop-blur-sm" : "border-white/10 bg-[#101017]"}`}
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => onOpen(item)}
                >
                  <h3
                    className={`flex cursor-pointer items-center gap-2 font-semibold transition-colors ${
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
                    {item.name}
                    {!canView ? (
                      <Lock
                        size={13}
                        className={light ? "text-gray-400" : "text-white/35"}
                      />
                    ) : null}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${visibilityBadgeClass(item.visibility, light)}`}
                    >
                      {visibilityLabel(item.visibility)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${competitionPhaseBadgeClass(championshipPhase(item.status), light)}`}
                    >
                      {championshipStatusLabel(item.status)}
                    </span>
                    <span className={`text-xs ${light ? "text-gray-400" : "text-white/45"}`}>
                      {item.teamCount} komanda
                    </span>
                  </div>
                  {item.description ? (
                    <p
                      className={`mt-2 line-clamp-2 text-sm ${light ? "text-gray-500" : "text-white/50"}`}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </button>
                {anyJoined ? (
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
                ) : canRequest || pendingRows.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {pendingRows.length > 0 ? (
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
                    {canRequest ? (
                      <Button
                        size="sm"
                        disabled={busy && joiningChampionshipId === item.id}
                        onClick={() => requestJoin(item, available)}
                      >
                        <Send size={14} />
                        Dəvət göndər
                      </Button>
                    ) : null}
                    {pendingRows.map((row) =>
                      row.pending ? (
                        <Button
                          key={row.pending.id}
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          onClick={() => onCancel(row.pending.id)}
                        >
                          <X size={14} />
                          {pendingRows.length > 1 ? `Ləğv et · ${row.team.name}` : "Ləğv et"}
                        </Button>
                      ) : null,
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <JoinTeamModal
        open={Boolean(pick)}
        light={light}
        busy={busy && joiningChampionshipId === pick?.item.id}
        targetName={pick?.item.name ?? ""}
        teams={pick?.teams ?? []}
        teamId={pickedTeamId}
        onTeamIdChange={setPickedTeamId}
        onClose={() => setPick(null)}
        onSubmit={() => {
          if (!pick || !pickedTeamId) return;
          onJoin(pick.item.id, Number(pickedTeamId));
          setPick(null);
        }}
      />
    </div>
  );
}
