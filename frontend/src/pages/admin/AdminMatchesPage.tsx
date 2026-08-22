import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  Plus,
  Radio,
  Search,
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
import { createMatch, fetchMyMatches } from "../../api/admin";
import { fetchLeagueTeams, fetchLeagues } from "../../api/leagues";
import { useAuth } from "../../context/AuthContext";
import type { League } from "../../types/league";
import type {
  LeagueTeamOption,
  Match,
  MatchStatus,
} from "../../types/match";

const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlaşdırılıb",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
  POSTPONED: "Təxirə",
};

function isUpcoming(status: MatchStatus): boolean {
  return status === "SCHEDULED" || status === "LIVE" || status === "POSTPONED";
}

function statusBadgeClass(status: MatchStatus): string {
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

function TeamMark({
  name,
  logo,
  align = "left",
}: {
  name: string;
  logo: string | null;
  align?: "left" | "right";
}) {
  const mark = logo ? (
    <img src={logo} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {mark}
      <span className="truncate font-semibold text-ink">{name}</span>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("az-AZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function minScheduleDate(from = new Date()): Date {
  return new Date(from.getTime() + 60 * 60 * 1000);
}

function MatchRow({ match }: { match: Match }) {
  return (
    <li>
      <Link
        to={`/admin/football/matches/${match.id}`}
        className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex w-full shrink-0 items-center gap-2 text-xs text-slate-500 sm:w-36 sm:flex-col sm:items-start sm:gap-1">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <Calendar className="h-3.5 w-3.5" />
            {formatWhen(match.scheduledAt)}
          </span>
          <span className="truncate">
            {match.round ? `${match.round}-ci tur` : match.venue || "Meydan yoxdur"}
          </span>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamMark
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            align="right"
          />
          <div className="min-w-[4.5rem] text-center">
            {match.status === "SCHEDULED" ? (
              <span className="text-lg font-bold tracking-wide text-slate-300">
                vs
              </span>
            ) : (
              <span className="text-xl font-black tabular-nums text-ink">
                {match.homeScore}:{match.awayScore}
              </span>
            )}
            {match.status === "LIVE" && match.minute != null ? (
              <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-600">
                <Radio className="h-3 w-3 animate-pulse" />
                {match.minute}&apos;
              </span>
            ) : null}
          </div>
          <TeamMark name={match.awayTeam.name} logo={match.awayTeam.logo} />
        </div>

        <div className="flex items-center justify-between gap-2 sm:w-40 sm:justify-end">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
              match.status,
            )}`}
          >
            {STATUS_LABEL[match.status]}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
      </Link>
    </li>
  );
}

export function AdminMatchesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leaguesReady, setLeaguesReady] = useState(false);
  const [teams, setTeams] = useState<LeagueTeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [leagueId, setLeagueId] = useState<number | "">("");
  const [homeTeamId, setHomeTeamId] = useState<number | "">("");
  const [awayTeamId, setAwayTeamId] = useState<number | "">("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(minScheduleDate()),
  );
  const [round, setRound] = useState("");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const minScheduledAt = useMemo(
    () => toLocalInputValue(minScheduleDate()),
    // Refresh the floor when the modal opens so "now + 1h" stays current.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: tie to modalOpen
    [modalOpen],
  );

  const selectedLeagueId = useMemo(() => {
    const raw = searchParams.get("leagueId");
    const parsed = raw ? Number(raw) : NaN;
    if (leagues.some((l) => l.id === parsed)) return parsed;
    return leagues[0]?.id ?? null;
  }, [leagues, searchParams]);

  const loadLeagues = useCallback(async () => {
    try {
      const leagueRows = await fetchLeagues();
      const mine = leagueRows.filter(
        (l) => l.sport.code === "FOOTBALL" && l.createdBy.id === user?.id,
      );
      setLeagues(mine);
      return mine;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oyunlar yüklənmədi");
      return [] as League[];
    } finally {
      setLeaguesReady(true);
    }
  }, [user?.id]);

  const loadMatches = useCallback(async (leagueKey: number) => {
    setLoading(true);
    setError(null);
    try {
      const matchRows = await fetchMyMatches({ leagueId: leagueKey });
      setMatches(matchRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oyunlar yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeagues();
  }, [loadLeagues]);

  useEffect(() => {
    if (!leaguesReady) return;
    if (leagues.length === 0) {
      setLoading(false);
      setMatches([]);
      return;
    }
    const raw = searchParams.get("leagueId");
    const parsed = raw ? Number(raw) : NaN;
    if (!leagues.some((l) => l.id === parsed)) {
      setSearchParams({ leagueId: String(leagues[0].id) }, { replace: true });
    }
  }, [leagues, leaguesReady, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedLeagueId) return;
    void loadMatches(selectedLeagueId);
  }, [loadMatches, selectedLeagueId]);

  const reload = useCallback(async () => {
    await loadLeagues();
    if (selectedLeagueId) await loadMatches(selectedLeagueId);
  }, [loadLeagues, loadMatches, selectedLeagueId]);

  useEffect(() => {
    if (!leagueId) {
      setTeams([]);
      return;
    }
    let cancelled = false;
    void fetchLeagueTeams(Number(leagueId))
      .then((rows) => {
        if (!cancelled) setTeams(rows);
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      });
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter(
      (m) =>
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q) ||
        (m.venue || "").toLowerCase().includes(q),
    );
  }, [matches, search]);

  const upcoming = useMemo(
    () =>
      filtered
        .filter((m) => isUpcoming(m.status))
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
    [filtered],
  );

  const past = useMemo(
    () =>
      filtered
        .filter((m) => !isUpcoming(m.status))
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
        ),
    [filtered],
  );

  const flash = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const resetForm = (presetLeague?: number | null) => {
    setLeagueId(presetLeague ?? selectedLeagueId ?? "");
    setHomeTeamId("");
    setAwayTeamId("");
    setScheduledAt(toLocalInputValue(minScheduleDate()));
    setRound("");
    setVenue("");
    setNotes("");
  };

  const openModal = () => {
    resetForm(selectedLeagueId);
    setModalOpen(true);
  };

  const selectLeague = (id: number) => {
    setSearchParams({ leagueId: String(id) });
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!leagueId) {
      flash("Liqa seçin", "error");
      return;
    }
    if (!homeTeamId || !awayTeamId) {
      flash("Ev sahibi və qonaq komandaları seçin", "error");
      return;
    }
    if (homeTeamId === awayTeamId) {
      flash("Eyni komanda iki tərəfdə ola bilməz", "error");
      return;
    }
    if (!scheduledAt) {
      flash("Tarix və vaxt mütləqdir", "error");
      return;
    }
    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      flash("Tarix və vaxt düzgün deyil", "error");
      return;
    }
    if (scheduledDate.getTime() < minScheduleDate().getTime()) {
      flash("Oyun ən azı 1 saat sonra üçün yaradıla bilər", "error");
      return;
    }
    if (!venue.trim()) {
      flash("Meydança mütləqdir", "error");
      return;
    }

    setSubmitting(true);
    try {
      await createMatch(Number(leagueId), {
        homeTeamId: Number(homeTeamId),
        awayTeamId: Number(awayTeamId),
        scheduledAt: scheduledDate.toISOString(),
        round: round ? Number(round) : undefined,
        venue: venue.trim(),
        notes: notes.trim() || undefined,
        matchType: "LEAGUE",
      });
      setModalOpen(false);
      setSearchParams({ leagueId: String(leagueId) });
      resetForm(Number(leagueId));
      flash("Oyun yaradıldı");
      await reload();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Oyun yaradılmadı", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageShell
      title="Oyunlar"
      subtitle="Oyunlar liqaya görə ayrılır. Tab seçin, sonra həmin liqanın matçlarını idarə edin."
      action={
        <button
          type="button"
          onClick={openModal}
          disabled={leagues.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-brand-dark disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Oyun əlavə et
        </button>
      }
    >
      {toast ? (
        <div
          className={`fixed top-6 right-6 z-[999] max-w-sm rounded-xl border px-5 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {leagues.map((league) => (
            <button
              key={league.id}
              type="button"
              onClick={() => selectLeague(league.id)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                selectedLeagueId === league.id
                  ? "bg-ink text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {league.name}
            </button>
          ))}
          
        </div>

        <div className="relative w-full sm:max-w-xs sm:self-end">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Komanda və ya meydan..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-500 shadow-sm">
          Yüklənir...
        </p>
      ) : error ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-rose-600 shadow-sm">
          {error}
        </p>
      ) : leagues.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-14 text-center shadow-sm">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            Əvvəlcə liqa və komanda yaradın.
          </p>
          <Link
            to="/admin/football/leagues"
            className="mt-3 inline-block text-sm font-semibold text-brand"
          >
            Liqalara keç →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-500 shadow-sm">
          Bu liqada oyun yoxdur.
        </p>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-ink">Keçiriləcək oyunlar</h2>
              <span className="text-xs font-semibold text-slate-400">
                {upcoming.length}
              </span>
            </div>
            {upcoming.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                Planlaşdırılmış oyun yoxdur.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-ink">Keçirilmiş oyunlar</h2>
              <span className="text-xs font-semibold text-slate-400">
                {past.length}
              </span>
            </div>
            {past.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                Bitmiş oyun yoxdur.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {past.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <AdminModal
        open={modalOpen}
        title="Yeni oyun"
        size="lg"
        onClose={() => !submitting && setModalOpen(false)}
        footer={
          <>
            <ModalCancelButton
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            />
            <ModalSubmitButton
              formId="create-match-form"
              label="Yarat"
              loading={submitting}
            />
          </>
        }
      >
        <ModalForm id="create-match-form" onSubmit={handleCreate}>
          <Field label="Liqa" required>
            <select
              className={inputClass}
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value ? Number(e.target.value) : "");
                setHomeTeamId("");
                setAwayTeamId("");
              }}
              required
            >
              <option value="">Seçin...</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ev sahibi" required>
              <select
                className={inputClass}
                value={homeTeamId}
                onChange={(e) =>
                  setHomeTeamId(e.target.value ? Number(e.target.value) : "")
                }
                disabled={!leagueId || teams.length === 0}
                required
              >
                <option value="">Seçin...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Qonaq" required>
              <select
                className={inputClass}
                value={awayTeamId}
                onChange={(e) =>
                  setAwayTeamId(e.target.value ? Number(e.target.value) : "")
                }
                disabled={!leagueId || teams.length === 0}
                required
              >
                <option value="">Seçin...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === homeTeamId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {leagueId && teams.length < 2 ? (
            <p className="mb-4 text-sm text-amber-600">
              Bu liqada ən azı 2 komanda lazımdır.{" "}
              <Link
                to={`/admin/football/leagues/${leagueId}`}
                className="font-semibold underline"
              >
                Komanda əlavə et
              </Link>
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Tarix və vaxt"
              required
              hint="Ən azı 1 saat sonra olmalıdır"
            >
              <input
                type="datetime-local"
                className={inputClass}
                value={scheduledAt}
                min={minScheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </Field>
            <Field label="Tur">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="məs. 12"
              />
            </Field>
            <Field label="Meydança" required>
              <input
                className={inputClass}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Stadion / meydança"
                required
              />
            </Field>
          </div>

          <Field label="Qeyd">
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="İstəyə görə əlavə məlumat..."
            />
          </Field>
        </ModalForm>
      </AdminModal>
    </AdminPageShell>
  );
}
