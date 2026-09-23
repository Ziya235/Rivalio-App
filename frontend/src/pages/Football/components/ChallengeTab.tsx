import {
  CalendarDays,
  Check,
  Clock,
  Hourglass,
  MapPin,
  Plus,
  Send,
  Swords,
  X,
} from "lucide-react";
import { Button, SelectField } from "../../../components/ui";
import { mediaUrl } from "../../../api/base";
import type { TeamSummary } from "../../../api/teams";
import type { Challenge } from "../../../api/social";
import { formatMatchDateTime } from "../helpers";
import { MetaChip } from "./MetaChip";

export function ChallengeTab({
  light,
  isCaptain,
  captainTeams,
  myChallenges,
  otherChallenges,
  userId,
  busy,
  respondingId,
  chReqTeamById,
  onCreate,
  onOpenTeam,
  onCancelRequest,
  onPickTeam,
  onRequest,
  onRespond,
}: {
  light: boolean;
  isCaptain: boolean;
  captainTeams: TeamSummary[];
  myChallenges: Challenge[];
  otherChallenges: Challenge[];
  userId: number;
  busy: boolean;
  respondingId: number | null;
  chReqTeamById: Record<number, string>;
  onCreate: () => void;
  onOpenTeam: (id: number) => void;
  onCancelRequest: (requestId: number) => void;
  onPickTeam: (challengeId: number, teamId: string) => void;
  onRequest: (challengeId: number, teamId: string) => void;
  onRespond: (requestId: number, action: "accept" | "reject") => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className={`text-sm ${light ? "text-gray-500" : "text-white/45"}`}>
          Rəqib axtaran komandalar
        </p>
        {isCaptain ? (
          <Button size="sm" onClick={onCreate}>
            <Plus size={14} />
            Oyun təklifi yarat
          </Button>
        ) : (
          <p className={`text-xs ${light ? "text-gray-400" : "text-white/35"}`}>
            Oyun təklifi yaratmaq üçün komanda kapitanı olmalısınız
          </p>
        )}
      </div>

      {([
        {
          title: "Sənin oyun təkliflərin",
          items: myChallenges,
          empty: "Hələ oyun təklifiniz yoxdur",
        },
        {
          title: "Digər oyun təklifləri",
          items: otherChallenges,
          empty: "Açıq oyun təklifi yoxdur",
        },
      ] as const).map((section) => (
        <section key={section.title} className="mb-8 last:mb-0">
          <h2
            className={`mb-3 text-sm font-semibold uppercase tracking-wider ${
              light ? "text-gray-500" : "text-white/40"
            }`}
          >
            {section.title}
            <span
              className={`ml-2 font-medium normal-case tracking-normal ${
                light ? "text-gray-400" : "text-white/30"
              }`}
            >
              {section.items.length}
            </span>
          </h2>
          {section.items.length === 0 ? (
            <p
              className={`text-center py-8 text-sm ${
                light ? "text-gray-400" : "text-white/40"
              }`}
            >
              {section.empty}
            </p>
          ) : (
            <div className="space-y-3">
              {section.items.map((c) => {
                const isHost = c.team.captainId === userId || c.createdById === userId;
                const pending = c.requests.filter((r) => r.status === "PENDING");
                const eligibleTeams = captainTeams.filter((t) => t.id !== c.teamId);
                const pickedTeamId =
                  eligibleTeams.length === 1
                    ? String(eligibleTeams[0].id)
                    : chReqTeamById[c.id] || "";
                const { date, time } = formatMatchDateTime(c.scheduledAt);
                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border p-5 ${light ? "bg-white/70 backdrop-blur-sm border-gray-200" : "border-white/10 bg-[#101017]"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={`font-semibold flex items-center gap-2 ${light ? "text-gray-900" : "text-white"}`}>
                          <Swords size={16} className={`shrink-0 ${light ? "text-emerald-500" : "text-[#c5f135]"}`} />
                          <button
                            type="button"
                            onClick={() => onOpenTeam(c.team.id)}
                            className={`text-left transition-colors cursor-pointer ${light ? "hover:text-emerald-600" : "hover:text-[#c5f135]"}`}
                          >
                            {c.team.name}
                          </button>
                          <span className={`font-medium ${light ? "text-gray-400" : "text-white/40"}`}>
                            rəqib axtarır
                          </span>
                          {c.status === "ACCEPTED" ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                              Rəqib tapıldı
                            </span>
                          ) : null}
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <MetaChip light={light} icon={CalendarDays} label="Tarix" value={date} />
                          <MetaChip light={light} icon={Clock} label="Vaxt" value={time} />
                          <MetaChip light={light} icon={MapPin} label="Məkan" value={c.venue} />
                        </div>
                        {c.notes ? (
                          <p className={`text-sm mt-2 ${light ? "text-gray-500" : "text-white/50"}`}>{c.notes}</p>
                        ) : null}
                      </div>
                      {!isHost ? (
                        c.myRequest?.status === "PENDING" && c.myRequest.id ? (
                          <div className="flex flex-wrap items-center gap-2">
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
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busy}
                              onClick={() => void onCancelRequest(c.myRequest!.id)}
                            >
                              <X size={14} />
                              Ləğv et
                            </Button>
                          </div>
                        ) : c.myRequest?.status === "ACCEPTED" ||
                          c.status === "ACCEPTED" ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              light
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            <Check size={13} />
                            Qəbul edildi
                          </span>
                        ) : isCaptain && eligibleTeams.length > 0 ? (
                          <div className="flex w-full max-w-xs flex-col items-stretch gap-2 sm:w-auto">
                            {eligibleTeams.length > 1 ? (
                              <SelectField
                                value={pickedTeamId}
                                onChange={(value) => onPickTeam(c.id, value)}
                                options={[
                                  { label: "Komanda seçin", value: "" },
                                  ...eligibleTeams.map((t) => ({
                                    label: t.name,
                                    value: String(t.id),
                                  })),
                                ]}
                                light={light}
                              />
                            ) : null}
                            <Button
                              size="sm"
                              disabled={busy || !pickedTeamId || c.status !== "OPEN"}
                              onClick={() => onRequest(c.id, pickedTeamId)}
                            >
                              <Send size={14} />
                              Sorğu göndər
                            </Button>
                          </div>
                        ) : null
                      ) : null}
                    </div>

                    {isHost ? (
                      <div
                        className={`mt-4 rounded-xl border ${
                          light
                            ? "border-gray-200 bg-gray-50/80"
                            : "border-white/8 bg-white/[0.03]"
                        }`}
                      >
                        {pending.length === 0 ? (
                          <p
                            className={`px-3 py-2.5 text-xs ${
                              light ? "text-gray-400" : "text-white/35"
                            }`}
                          >
                            {c.status === "ACCEPTED"
                              ? "Rəqib komanda seçildi"
                              : "Gözləyən sorğu yoxdur"}
                          </p>
                        ) : (
                          <>
                            <div
                              className={`flex items-center justify-between border-b px-3 py-2 ${
                                light ? "border-gray-200" : "border-white/8"
                              }`}
                            >
                              <p
                                className={`text-[11px] font-semibold uppercase tracking-wider ${
                                  light ? "text-gray-400" : "text-white/40"
                                }`}
                              >
                                Gələn sorğular
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  light
                                    ? "bg-white text-gray-500"
                                    : "bg-white/8 text-white/50"
                                }`}
                              >
                                {pending.length}
                              </span>
                            </div>
                            <div
                              className={`max-h-56 overflow-y-auto divide-y ${
                                light ? "divide-gray-200" : "divide-white/10"
                              }`}
                            >
                              {pending.map((r) => {
                                const requester = r.requestedBy;
                                const fullName = requester
                                  ? `${requester.firstName} ${requester.lastName}`.trim()
                                  : "";
                                return (
                                  <div
                                    key={r.id}
                                    className="flex items-center gap-2.5 px-3 py-2"
                                  >
                                    {r.team.logo ? (
                                      <img
                                        src={mediaUrl(r.team.logo)}
                                        alt=""
                                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                                      />
                                    ) : requester?.image ? (
                                      <img
                                        src={mediaUrl(requester.image)}
                                        alt=""
                                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                                          light
                                            ? "bg-emerald-500/15 text-emerald-600"
                                            : "bg-[#c5f135]/15 text-[#c5f135]"
                                        }`}
                                      >
                                        {r.team.name.slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className={`truncate text-sm font-medium ${
                                          light ? "text-gray-900" : "text-white"
                                        }`}
                                      >
                                        {r.team.name}
                                      </p>
                                      <p
                                        className={`truncate text-[11px] ${
                                          light ? "text-gray-400" : "text-white/40"
                                        }`}
                                      >
                                        {requester
                                          ? `@${requester.username}${fullName ? ` · ${fullName}` : ""}`
                                          : "Kapitan"}
                                        {r.message ? ` · ${r.message}` : ""}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1.5">
                                      <button
                                        type="button"
                                        title="Qəbul"
                                        disabled={respondingId === r.id}
                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 text-[11px] font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                                        onClick={() => onRespond(r.id, "accept")}
                                      >
                                        <Check size={13} />
                                        Qəbul
                                      </button>
                                      <button
                                        type="button"
                                        title="Rədd"
                                        disabled={respondingId === r.id}
                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-rose-500/10 px-2.5 text-[11px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                                        onClick={() => onRespond(r.id, "reject")}
                                      >
                                        <X size={13} />
                                        Rədd
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
