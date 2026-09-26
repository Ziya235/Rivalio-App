import { useCallback, useEffect, useState } from "react";
import { AdminPageShell } from "../../../components/admin/AdminLayout";
import { fetchLeagues } from "../../../api/leagues";
import { useAuth } from "../../../context/AuthContext";
import type { League } from "../../../types/league";
import {
  CreateLeagueButton,
  CreateLeagueModal,
  LeagueList,
  LeagueStats,
} from "./components";

export function AdminLeaguesPage() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeagues();
      setLeagues(
        data.filter(
          (league) => league.sport.code === "FOOTBALL" && league.createdBy.id === user?.id,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liqalar yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreated = async () => {
    setModalOpen(false);
    await load();
  };

  return (
    <AdminPageShell
      title="Liqaların idarə olunması"
      subtitle="Yalnız sizin yaratdığınız liqalar burada görünür. Yeni ictimai və ya özəl liqa yarada bilərsiniz."
      action={<CreateLeagueButton onClick={() => setModalOpen(true)} />}
    >
      <LeagueStats leagues={leagues} />
      <LeagueList leagues={leagues} loading={loading} error={error} />
      <CreateLeagueModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </AdminPageShell>
  );
}
