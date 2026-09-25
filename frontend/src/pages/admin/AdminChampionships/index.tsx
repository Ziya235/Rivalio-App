import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Medal, Trophy } from "lucide-react";
import { AdminPageShell } from "../../../components/admin/AdminLayout";
import { StatCard } from "../../../components/admin/AdminModal";
import { fetchChampionships } from "../../../api/championships";
import { championshipPhase } from "../../../lib/competitionStatus";
import type { Championship } from "../../../types/championship";
import {
  ChampionshipList,
  CreateChampionshipButton,
  CreateChampionshipModal,
} from "./components";

export function AdminChampionshipsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchChampionships());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => championshipPhase(row.status) === "ONGOING").length,
    }),
    [rows],
  );

  const handleCreated = async (id: number) => {
    setModalOpen(false);
    await load();
    navigate(`/admin/football/championships/${id}`);
  };

  return (
    <AdminPageShell
      title="Çempionatlar"
      subtitle="Futbol çempionatlarını yaradın və qrup/playoff mərhələlərini idarə edin."
      action={<CreateChampionshipButton onClick={() => setModalOpen(true)} />}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Cəmi"
          value={stats.total}
          icon={<Medal className="h-4 w-4" />}
        />
        <StatCard
          label="Davam edir"
          value={stats.active}
          icon={<Trophy className="h-4 w-4" />}
        />
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
          <div className="mt-6">
            <CreateChampionshipButton
              onClick={() => setModalOpen(true)}
              className=""
            />
          </div>
        </div>
      ) : (
        <ChampionshipList rows={rows} />
      )}

      <CreateChampionshipModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </AdminPageShell>
  );
}
