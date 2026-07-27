import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  MatchType,
} from "../../types/match";

type StatusFilter = "ALL" | MatchStatus;

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "Hamısı" },
  { id: "SCHEDULED", label: "Planlı" },
  { id: "LIVE", label: "Canlı" },
  { id: "FINISHED", label: "Nəticə" },
];

const STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Planlaşdırılıb",
  LIVE: "Canlı",
  FINISHED: "Bitib",
  CANCELLED: "Ləğv",
  POSTPONED: "Təxirə",
};

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

export function AdminMatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<LeagueTeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [leagueFilter, setLeagueFilter] = useState<number | "">("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [leagueId, setLeagueId] = useState<number | "">("");
  const [homeTeamId, setHomeTeamId] = useState<number | "">("");
  const [awayTeamId, setAwayTeamId] = useState<number | "">("");
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue());
  const [round, setRound] = useState("");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [matchType, setMatchType] = useState<MatchType>("LEAGUE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leagueRows, matchRows] = await Promise.all([
        fetchLeagues(),
        fetchMyMatches(
          leagueFilter
            ? { leagueId: Number(leagueFilter) }
            : undefined,
        ),
      ]);
      const mine = leagueRows.filter(
        (l) => l.sport.code === "FOOTBALL" && l.createdBy.id === user?.id,
      );
      setLeagues(mine);
      setMatches(matchRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oyunlar yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [leagueFilter, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

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
    let rows = matches;
    if (statusFilter !== "ALL") {
      rows = rows.filter((m) => m.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (m) =>
          m.homeTeam.name.toLowerCase().includes(q) ||
          m.awayTeam.name.toLowerCase().includes(q) ||
          m.league.name.toLowerCase().includes(q) ||
          (m.venue || "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [matches, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      ALL: matches.length,
      SCHEDULED: matches.filter((m) => m.status === "SCHEDULED").length,
      LIVE: matches.filter((m) => m.status === "LIVE").length,
      FINISHED: matches.filter((m) => m.status === "FINISHED").length,
    };
  }, [matches]);

  const resetForm = () => {
    setLeagueId(leagues[0]?.id ?? "");
    setHomeTeamId("");
    setAwayTeamId("");
    setScheduledAt(toLocalInputValue());
    setRound("");
    setVenue("");
    setNotes("");
    setMatchType("LEAGUE");
    setFormError(null);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!leagueId) {
      setFormError("Liqa seçin");
      return;
    }
    if (!homeTeamId || !awayTeamId) {
      setFormError("Ev sahibi və qonaq komandaları seçin");
      return;
    }
    if (homeTeamId === awayTeamId) {
      setFormError("Eyni komanda iki tərəfdə ola bilməz");
      return;
    }
    if (!scheduledAt) {
      setFormError("Tarix və vaxt mütləqdir");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createMatch(Number(leagueId), {
        homeTeamId: Number(homeTeamId),
        awayTeamId: Number(awayTeamId),
        scheduledAt: new Date(scheduledAt).toISOString(),
        round: round ? Number(round) : undefined,
        venue: venue.trim() || undefined,
        notes: notes.trim() || undefined,
        matchType,
      });
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Oyun yaradılmadı");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageShell
      title="Oyunlar"
      subtitle="Matçları planlaşdırın, canlı idarə edin və nəticələri yazın. Bitmiş liqa oyunları avtomatik cədvələ düşür."
      action={
        <button
          type="button"
          onClick={openModal}
          disabled={leagues.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Oyun əlavə et
        </button>
      }
    >
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                statusFilter === tab.id
                  ? "bg-ink text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">
                {counts[tab.id as keyof typeof counts] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className={`${inputClass} sm:w-52`}
            value={leagueFilter}
            onChange={(e) =>
              setLeagueFilter(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">Bütün liqalar</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Komanda və ya liqa..."
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-4 py-14 text-center text-sm text-slate-500">
            Yüklənir...
          </p>
        ) : error ? (
          <p className="px-4 py-14 text-center text-sm text-rose-600">{error}</p>
        ) : leagues.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              Əvvəlcə liqa və komanda yaradın.
            </p>
            <Link
              to="/admin"
              className="mt-3 inline-block text-sm font-semibold text-brand"
            >
              Liqalara keç →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-slate-500">
            Bu filtrə uyğun oyun yoxdur.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((match) => (
              <li key={match.id}>
                <Link
                  to={`/admin/matches/${match.id}`}
                  className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex w-full shrink-0 items-center gap-2 text-xs text-slate-500 sm:w-36 sm:flex-col sm:items-start sm:gap-1">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatWhen(match.scheduledAt)}
                    </span>
                    <span className="truncate">
                      {match.league.name}
                      {match.round ? ` · ${match.round}-ci tur` : ""}
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
                    <TeamMark
                      name={match.awayTeam.name}
                      logo={match.awayTeam.logo}
                    />
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
            ))}
          </ul>
        )}
      </div>

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
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Oyun növü">
              <select
                className={inputClass}
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as MatchType)}
              >
                <option value="LEAGUE">Liqa oyunu</option>
                <option value="FRIENDLY">Yoldaşlıq</option>
              </select>
            </Field>
          </div>

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
                to={`/admin/leagues/${leagueId}`}
                className="font-semibold underline"
              >
                Komanda əlavə et
              </Link>
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tarix və vaxt" required>
              <input
                type="datetime-local"
                className={inputClass}
                value={scheduledAt}
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
            <Field label="Meydan">
              <input
                className={inputClass}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Stadion / meydança"
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

          {formError ? (
            <p className="mb-2 text-sm text-rose-600">{formError}</p>
          ) : null}
        </ModalForm>
      </AdminModal>
    </AdminPageShell>
  );
}
