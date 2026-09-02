import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  Medal,
  Plus,
  Trophy,
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
  createChampionship,
  fetchChampionships,
} from "../../api/championships";
import type {
  Championship,
  ChampionshipFormat,
  ChampionshipMatchFormat,
  ChampionshipStatus,
} from "../../types/championship";

const STATUS_LABEL: Record<ChampionshipStatus, string> = {
  DRAFT: "Draft",
  REGISTRATION: "Qeydiyyat",
  GROUP_STAGE: "Qrup mərhələsi",
  PLAYOFF: "Playoff",
  COMPLETED: "Bitib",
  CANCELLED: "Ləğv",
};

const FORMAT_LABEL: Record<ChampionshipFormat, string> = {
  GROUP_AND_PLAYOFF: "Qrup + Playoff",
  PLAYOFF_ONLY: "Yalnız Playoff",
};

const MATCH_FORMAT_LABEL: Record<ChampionshipMatchFormat, string> = {
  SINGLE: "1 oyun",
  HOME_AWAY: "Ev-səfər",
};

function statusClass(status: ChampionshipStatus): string {
  switch (status) {
    case "GROUP_STAGE":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    case "PLAYOFF":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
    default:
      return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("az-AZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminChampionshipsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<ChampionshipFormat>("GROUP_AND_PLAYOFF");
  const [matchFormat, setMatchFormat] =
    useState<ChampionshipMatchFormat>("SINGLE");
  const [maxTeams, setMaxTeams] = useState("8");
  const [startDate, setStartDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChampionships();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setName("");
    setDescription("");
    setFormat("GROUP_AND_PLAYOFF");
    setMatchFormat("SINGLE");
    setMaxTeams("8");
    setStartDate("");
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormatChange = (next: ChampionshipFormat) => {
    setFormat(next);
    if (next === "PLAYOFF_ONLY") {
      setMaxTeams((prev) =>
        ["4", "8", "16"].includes(prev) ? prev : "8",
      );
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Ad mütləqdir");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createChampionship({
        name: name.trim(),
        description: description.trim() || undefined,
        format,
        matchFormat,
        maxTeams:
          format === "PLAYOFF_ONLY"
            ? Number(maxTeams)
            : 20,
        startDate: startDate || undefined,
        sportCode: "FOOTBALL",
      });
      setModalOpen(false);
      await load();
      navigate(`/admin/football/championships/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Yaradılmadı");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((r) =>
        ["GROUP_STAGE", "PLAYOFF", "REGISTRATION"].includes(r.status),
      ).length,
    };
  }, [rows]);

  return (
    <AdminPageShell
      title="Çempionatlar"
      subtitle="Futbol çempionatlarını yaradın və qrup/playoff mərhələlərini idarə edin."
      action={
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Create Championship
        </button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Medal className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-ink">{stats.total}</p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">Cəmi</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Trophy className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-ink">{stats.active}</p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">Aktiv</p>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Yüklənir...</p>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Medal className="mb-4 h-10 w-10 text-slate-300" />
          <p className="text-lg font-extrabold text-ink">Çempionat yoxdur</p>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            İlk çempionatı yaradıb komandaları və qrupları qurun.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Create Championship
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/admin/football/championships/${c.id}`}
                  className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-extrabold text-ink">
                        {c.name}
                      </p>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusClass(
                          c.status,
                        )}`}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.sport?.name ?? "Futbol"} · {FORMAT_LABEL[c.format]} ·{" "}
                      {MATCH_FORMAT_LABEL[c.matchFormat ?? "SINGLE"]} ·{" "}
                      {c.teamCount} komanda
                      {c.createdBy
                        ? ` · ${c.createdBy.firstName} ${c.createdBy.lastName}`
                        : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(c.startDate)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AdminModal
        open={modalOpen}
        title="Create Championship"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            />
            <ModalSubmitButton
              label="Yarat"
              loading={submitting}
              formId="create-championship"
            />
          </>
        }
      >
        <ModalForm id="create-championship" onSubmit={handleCreate}>
          <Field label="Ad" required>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="Təsvir">
            <textarea
              className={inputClass}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Format" required>
            <select
              className={inputClass}
              value={format}
              onChange={(e) =>
                handleFormatChange(e.target.value as ChampionshipFormat)
              }
            >
              <option value="GROUP_AND_PLAYOFF">Qrup + Playoff</option>
              <option value="PLAYOFF_ONLY">Yalnız Playoff</option>
            </select>
          </Field>
          {format === "PLAYOFF_ONLY" ? (
            <p className="text-xs text-slate-500">
              Yalnız 4, 8 və ya 16 komanda. Başladıqda 1/8 → 1/4 → 1/2 → final
              mərhələləri komanda sayına görə yaranır.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Əvvəl qrup mərhələsi, sonra playoff. Komandalar 6–20 aralığında
              əlavə olunur.
            </p>
          )}
          {format === "PLAYOFF_ONLY" ? (
            <Field label="Komanda sayı" required>
              <select
                className={inputClass}
                value={maxTeams}
                onChange={(e) => setMaxTeams(e.target.value)}
              >
                <option value="4">4 (yarımfinal)</option>
                <option value="8">8 (1/4 final)</option>
                <option value="16">16 (1/8 final)</option>
              </select>
            </Field>
          ) : null}
          <Field label="Başlama tarixi">
            <input
              type="date"
              className={inputClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="Oyun formatı" required>
            <select
              className={inputClass}
              value={matchFormat}
              onChange={(e) =>
                setMatchFormat(e.target.value as ChampionshipMatchFormat)
              }
            >
              <option value="SINGLE">1 oyun</option>
              <option value="HOME_AWAY">Ev-səfər</option>
            </select>
          </Field>
          {formError ? (
            <p className="text-sm font-medium text-rose-600">{formError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>
    </AdminPageShell>
  );
}
