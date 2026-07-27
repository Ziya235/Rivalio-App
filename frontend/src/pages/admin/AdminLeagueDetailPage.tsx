import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Plus,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { AdminPageShell } from "../../components/admin/AdminLayout";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../components/admin/AdminModal";
import {
  deleteTeam,
  fetchLeagueInvites,
  fetchLeagueJoinRequests,
  inviteTeamToLeague,
  respondJoinRequest,
  type LeagueInvite,
  type LeagueJoinRequest,
} from "../../api/admin";
import { fetchLeagueStandings, fetchLeagues } from "../../api/leagues";
import type { League, StandingRow } from "../../types/league";

function formatDiff(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function AdminLeagueDetailPage() {
  const { leagueId: leagueIdParam } = useParams();
  const leagueId = Number(leagueIdParam);

  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [invites, setInvites] = useState<LeagueInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<LeagueJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const [teamName, setTeamName] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      setError("Yanlış liqa");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [leagues, standingsRes, inviteRes, joinRes] = await Promise.all([
        fetchLeagues(),
        fetchLeagueStandings(leagueId),
        fetchLeagueInvites(leagueId),
        fetchLeagueJoinRequests(leagueId),
      ]);
      const found = leagues.find((l) => l.id === leagueId) || null;
      if (!found) {
        setError("Liqa tapılmadı və ya giriş icazəniz yoxdur");
        setLeague(null);
        setStandings([]);
        setInvites([]);
        setJoinRequests([]);
      } else {
        setLeague(found);
        setStandings(standingsRes.standings);
        setInvites(inviteRes);
        setJoinRequests(joinRes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Məlumat yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setTeamName("");
    setMessage("");
    setFormError(null);
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setFormError("Komanda adı mütləqdir");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await inviteTeamToLeague(leagueId, {
        teamName: teamName.trim(),
        message: message.trim() || undefined,
      });
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Dəvət göndərilmədi",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (teamId: number, name: string) => {
    if (
      !window.confirm(
        `"${name}" komandasını liqadan çıxarmaq istəyirsiniz? Komanda silinməyəcək.`,
      )
    ) {
      return;
    }
    setDeletingId(teamId);
    try {
      await deleteTeam(leagueId, teamId);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinmədi");
    } finally {
      setDeletingId(null);
    }
  };

  const handleJoinRespond = async (
    requestId: number,
    action: "accept" | "reject",
  ) => {
    setRespondingId(requestId);
    try {
      await respondJoinRequest(requestId, action);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>
    );
  }

  if (error || !league) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-rose-600">{error || "Liqa tapılmadı"}</p>
        <Link to="/admin" className="text-sm font-semibold text-brand">
          ← Liqalara qayıt
        </Link>
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "PENDING");
  const pendingJoins = joinRequests.filter((r) => r.status === "PENDING");

  return (
    <AdminPageShell
      title={league.name}
      subtitle={`${league.season || "Mövsüm yoxdur"} · ${
        league.visibility === "PUBLIC" ? "İctimai" : "Özəl"
      } · Turnir cədvəli və komanda idarəsi`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/matches"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Oyunlar
          </Link>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Komanda dəvət et
          </button>
        </div>
      }
    >
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-slate-500">
        <Link to="/admin" className="hover:text-brand">
          Liqalar
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">{league.name}</span>
      </nav>

      {pendingJoins.length > 0 ? (
        <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="border-b border-amber-100 px-4 py-3">
            <h2 className="text-base font-bold text-ink">
              Qoşulma sorğuları ({pendingJoins.length})
            </h2>
            <p className="text-xs text-slate-500">
              Public liqaya komanda kapitanlarından gələn sorğular
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendingJoins.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-ink">{req.team.name}</p>
                  <p className="text-xs text-slate-500">
                    @{req.requestedBy.username} ·{" "}
                    {req.team.city || "Şəhər yoxdur"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={respondingId === req.id}
                    onClick={() => void handleJoinRespond(req.id, "accept")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Qəbul
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === req.id}
                    onClick={() => void handleJoinRespond(req.id, "reject")}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Rədd
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pendingInvites.length > 0 ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="font-semibold text-ink">
            Gözləyən dəvətlər:{" "}
          </span>
          {pendingInvites.map((i) => i.team.name).join(", ")}
        </div>
      ) : null}

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Trophy className="h-4 w-4 text-brand" />
          <h2 className="text-base font-bold text-ink">Turnir cədvəli</h2>
        </div>
        {standings.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Hələ komanda yoxdur. Mövcud komandanı dəvət edin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 text-center">#</th>
                  <th className="px-3 py-3">Komanda</th>
                  <th className="px-2 py-3 text-center">O</th>
                  <th className="px-2 py-3 text-center">Q</th>
                  <th className="px-2 py-3 text-center">H</th>
                  <th className="px-2 py-3 text-center">M</th>
                  <th className="px-2 py-3 text-center">TF</th>
                  <th className="px-2 py-3 text-center">X</th>
                  <th className="px-3 py-3 text-right">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, index) => (
                  <tr
                    key={row.teamId}
                    className="border-b border-slate-50 hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-3 text-center font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        to={`/admin/leagues/${leagueId}/teams/${row.teamId}`}
                        className="flex items-center gap-2.5 font-semibold text-ink hover:text-brand"
                      >
                        {row.logo ? (
                          <img
                            src={row.logo}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                            {row.teamName.slice(0, 1)}
                          </span>
                        )}
                        {row.teamName}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-center text-slate-600">
                      {row.played}
                    </td>
                    <td className="px-2 py-3 text-center text-slate-600">
                      {row.wins}
                    </td>
                    <td className="px-2 py-3 text-center text-slate-600">
                      {row.draws}
                    </td>
                    <td className="px-2 py-3 text-center text-slate-600">
                      {row.losses}
                    </td>
                    <td className="px-2 py-3 text-center text-slate-600">
                      {formatDiff(row.goalDifference)}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-ink">
                      {row.points}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/leagues/${leagueId}/teams/${row.teamId}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Oyunçular
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === row.teamId}
                          onClick={() =>
                            void handleDelete(row.teamId, row.teamName)
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          title="Liqadan çıxar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminModal
        open={modalOpen}
        title="Komandanı liqaya dəvət et"
        onClose={() => !submitting && setModalOpen(false)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            />
            <ModalSubmitButton
              formId="invite-team-form"
              label="Dəvət göndər"
              loading={submitting}
            />
          </>
        }
      >
        <ModalForm id="invite-team-form" onSubmit={handleInvite}>
          <p className="mb-3 text-sm text-slate-500">
            Mövcud komandanın unikal adını yazın. Dəvət komanda kapitanına
            gedəcək.
          </p>
          <Field label="Komanda adı" required>
            <input
              className={inputClass}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="məs. Bakı Strikerlər"
              required
            />
          </Field>
          <Field label="Mesaj (istəyə bağlı)">
            <input
              className={inputClass}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Liqamıza qoşulun..."
            />
          </Field>
          {formError ? (
            <p className="mb-2 text-sm text-rose-600">{formError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>
    </AdminPageShell>
  );
}
