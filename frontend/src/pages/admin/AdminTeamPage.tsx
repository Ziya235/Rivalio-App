import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Plus, Trash2, Users } from "lucide-react";
import { AdminPageShell } from "../../components/admin/AdminLayout";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  inputClass,
} from "../../components/admin/AdminModal";
import { createPlayer, deletePlayer } from "../../api/admin";
import { fetchTeam } from "../../api/leagues";
import type { TeamDetail, TeamPlayer } from "../../types/league";

const POSITIONS = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
];

function PlayerAvatar({ player }: { player: TeamPlayer }) {
  const name = `${player.firstName} ${player.lastName}`.trim();
  if (player.photo) {
    return (
      <img
        src={player.photo}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AdminTeamPage() {
  const { leagueId: leagueIdParam, teamId: teamIdParam } = useParams();
  const leagueId = Number(leagueIdParam);
  const teamId = Number(teamIdParam);

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [photo, setPhoto] = useState("");

  const load = useCallback(async () => {
    if (!Number.isInteger(leagueId) || leagueId <= 0) {
      setError("Yanlış liqa");
      setLoading(false);
      return;
    }
    if (!Number.isInteger(teamId) || teamId <= 0) {
      setError("Yanlış komanda");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeam(leagueId, teamId);
      setTeam(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Komanda yüklənmədi");
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [leagueId, teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPosition("");
    setShirtNumber("");
    setPhoto("");
    setFormError(null);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("Ad və soyad mütləqdir");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const num = shirtNumber.trim() ? Number(shirtNumber) : undefined;
      await createPlayer(teamId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        position: position || undefined,
        shirtNumber: Number.isInteger(num) ? num : undefined,
        photo: photo.trim() || undefined,
      });
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Oyunçu əlavə edilmədi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (player: TeamPlayer) => {
    const full = `${player.firstName} ${player.lastName}`;
    if (!window.confirm(`"${full}" oyunçusunu silmək istəyirsiniz?`)) return;
    setDeletingId(player.id);
    try {
      await deletePlayer(leagueId, teamId, player.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Silinmədi");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>
    );
  }

  if (error || !team) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-rose-600">
          {error || "Komanda tapılmadı"}
        </p>
        <Link
          to={`/admin/leagues/${leagueId}`}
          className="text-sm font-semibold text-brand"
        >
          ← Liqaya qayıt
        </Link>
      </div>
    );
  }

  return (
    <AdminPageShell
      title={team.name}
      subtitle={`${team.league.name}${
        team.city ? ` · ${team.city}` : ""
      } · Oyunçu heyəti`}
      action={
        <button
          type="button"
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Oyunçu əlavə et
        </button>
      }
    >
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link to="/admin" className="hover:text-brand">
          Liqalar
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          to={`/admin/leagues/${leagueId}`}
          className="hover:text-brand"
        >
          {team.league.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">{team.name}</span>
      </nav>

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {team.logo ? (
          <img
            src={team.logo}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand">
            {team.name.slice(0, 1)}
          </span>
        )}
        <div>
          <p className="text-lg font-bold text-ink">{team.name}</p>
          <p className="text-sm text-slate-500">
            {team.players.length} oyunçu
            {team.shortName ? ` · ${team.shortName}` : ""}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Users className="h-4 w-4 text-brand" />
          <h2 className="text-base font-bold text-ink">Oyunçular</h2>
        </div>
        {team.players.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Hələ oyunçu yoxdur. &quot;Oyunçu əlavə et&quot; ilə başlayın.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Oyunçu</th>
                  <th className="px-4 py-3">№</th>
                  <th className="px-4 py-3">Pozisiya</th>
                  <th className="px-4 py-3 text-right">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {team.players.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-slate-50 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar player={player} />
                        <span className="font-semibold text-ink">
                          {player.firstName} {player.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {player.shirtNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {player.position || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={deletingId === player.id}
                        onClick={() => void handleDelete(player)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
        title="Yeni oyunçu əlavə et"
        onClose={() => !submitting && setModalOpen(false)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            />
            <ModalSubmitButton
              formId="create-player-form"
              label="Yarat"
              loading={submitting}
            />
          </>
        }
      >
        <ModalForm id="create-player-form" onSubmit={handleCreate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad" required>
              <input
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ad"
                required
              />
            </Field>
            <Field label="Soyad" required>
              <input
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Soyad"
                required
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pozisiya">
              <select
                className={inputClass}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="">Seçin</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Forma nömrəsi">
              <input
                className={inputClass}
                type="number"
                min={1}
                max={99}
                value={shirtNumber}
                onChange={(e) => setShirtNumber(e.target.value)}
                placeholder="10"
              />
            </Field>
          </div>
          <Field label="Foto URL">
            <input
              className={inputClass}
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://..."
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
