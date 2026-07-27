import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  Plus,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { AdminPageShell } from "../../components/admin/AdminLayout";
import {
  AdminModal,
  Field,
  ModalCancelButton,
  ModalForm,
  ModalSubmitButton,
  StatCard,
  inputClass,
} from "../../components/admin/AdminModal";
import { createLeague } from "../../api/admin";
import { fetchLeagues } from "../../api/leagues";
import { useAuth } from "../../context/AuthContext";
import type { League } from "../../types/league";

function seasonOptions(): string[] {
  const year = new Date().getFullYear();
  return [
    `${year - 1}/${year}`,
    `${year}/${year + 1}`,
    `${year + 1}/${year + 2}`,
  ];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("az-AZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LeagueAvatar({ league }: { league: League }) {
  if (league.logo) {
    return (
      <img
        src={league.logo}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
      {league.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AdminLeaguesPage() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [season, setSeason] = useState(seasonOptions()[1]);
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [logo, setLogo] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeagues();
      const mine = data.filter(
        (l) => l.sport.code === "FOOTBALL" && l.createdBy.id === user?.id,
      );
      setLeagues(mine);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liqalar yüklənmədi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leagues;
    return leagues.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.season || "").toLowerCase().includes(q) ||
        (l.description || "").toLowerCase().includes(q),
    );
  }, [leagues, search]);

  const stats = useMemo(() => {
    const publicCount = leagues.filter((l) => l.visibility === "PUBLIC").length;
    const teams = leagues.reduce((sum, l) => sum + l._count.teams, 0);
    const activeSeason =
      leagues.find((l) => l.status === "ACTIVE")?.season ||
      leagues[0]?.season ||
      "—";
    return { publicCount, teams, activeSeason, total: leagues.length };
  }, [leagues]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSeason(seasonOptions()[1]);
    setVisibility("PUBLIC");
    setLogo("");
    setFormError(null);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Liqa adı mütləqdir");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createLeague({
        name: name.trim(),
        description: description.trim() || undefined,
        season: season || undefined,
        visibility,
        logo: logo.trim() || undefined,
      });
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Liqa yaradılmadı");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageShell
      title="Liqaların idarə olunması"
      subtitle="Yalnız sizin yaratdığınız liqalar burada görünür. Yeni ictimai və ya özəl liqa yarada bilərsiniz."
      action={
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Liqa yarat
        </button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="İctimai liqalar"
          value={stats.publicCount}
          sub={`${stats.total} cəmi`}
          icon={<Trophy className="h-4 w-4" />}
        />
        <StatCard
          label="Komandalar"
          value={stats.teams}
          sub="Bütün liqalarda"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Özəl liqalar"
          value={stats.total - stats.publicCount}
          sub="Yalnız sizin"
          icon={<ShieldIcon />}
        />
        <StatCard
          label="Aktiv mövsüm"
          value={stats.activeSeason}
          sub="Son seçilmiş"
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-ink">Mövcud liqalar</h2>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Axtarış..."
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            Yüklənir...
          </p>
        ) : error ? (
          <p className="px-4 py-12 text-center text-sm text-rose-600">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            Hələ liqa yoxdur. &quot;Liqa yarat&quot; ilə başlayın.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Liqanın adı</th>
                  <th className="px-4 py-3">Komandalar</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Yaradılıb</th>
                  <th className="px-4 py-3 text-right">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((league) => (
                  <tr
                    key={league.id}
                    className="border-b border-slate-50 transition hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/leagues/${league.id}`}
                        className="flex items-center gap-3"
                      >
                        <LeagueAvatar league={league} />
                        <span>
                          <span className="block font-semibold text-ink">
                            {league.name}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {league.season || "Mövsüm yoxdur"} ·{" "}
                            {league.visibility === "PUBLIC"
                              ? "İctimai"
                              : "Özəl"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {league._count.teams}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {league.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(league.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/leagues/${league.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft"
                      >
                        İdarə et
                        <ChevronRight className="h-4 w-4" />
                      </Link>
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
        title="Yeni liqa yarat"
        onClose={() => !submitting && setModalOpen(false)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            />
            <ModalSubmitButton
              formId="create-league-form"
              label="Yarat"
              loading={submitting}
            />
          </>
        }
      >
        <ModalForm id="create-league-form" onSubmit={handleCreate}>
          <Field label="Liqa adı" required>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="məs. Premier Liqa"
              maxLength={80}
              required
            />
          </Field>
          <Field
            label="Açıqlama"
            hint={`${description.length}/300`}
          >
            <textarea
              className={`${inputClass} min-h-[88px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="Qısa açıqlama yazın..."
              maxLength={300}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mövsüm">
              <select
                className={inputClass}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                {seasonOptions().map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Görünürlük">
              <select
                className={inputClass}
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as "PUBLIC" | "PRIVATE")
                }
              >
                <option value="PUBLIC">İctimai (Public)</option>
                <option value="PRIVATE">Özəl (Private)</option>
              </select>
            </Field>
          </div>
          <Field
            label="Logo URL"
            hint="Şəkil yükləmə API-si yoxdur — logo üçün birbaşa URL daxil edin."
          >
            <input
              className={inputClass}
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
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

function ShieldIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"
      />
    </svg>
  );
}
