import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { inputClass } from "../../../../components/admin/AdminModal";
import type { League } from "../../../../types/league";
import { LeagueTable } from "./LeagueTable";

export function LeagueList({
  leagues,
  loading,
  error,
}: {
  leagues: League[];
  loading: boolean;
  error: string | null;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim();

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    if (!needle) return leagues;
    return leagues.filter(
      (league) =>
        league.name.toLowerCase().includes(needle) ||
        (league.season || "").toLowerCase().includes(needle) ||
        (league.description || "").toLowerCase().includes(needle),
    );
  }, [leagues, query]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-ink">Mövcud liqalar</h2>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Axtarış..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {loading ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">Yüklənir...</p>
      ) : error ? (
        <p className="px-4 py-12 text-center text-sm text-rose-600">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">
          {query
            ? `(${query}) liga yoxdur`
            : "Hələ liqa yoxdur. \"Liqa yarat\" ilə başlayın."}
        </p>
      ) : (
        <LeagueTable leagues={filtered} />
      )}
    </div>
  );
}
