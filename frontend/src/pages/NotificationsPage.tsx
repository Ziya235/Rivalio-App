import { useCallback, useEffect, useState } from "react";
import { Trophy, Check, X, Bell } from "lucide-react";
import { Button } from "../components/ui";
import {
  fetchMyTeamInvites,
  respondTeamInvite,
  type TeamInvite,
} from "../api/teams";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyTeamInvites();
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (id: number, action: "accept" | "reject") => {
    setBusyId(id);
    try {
      await respondTeamInvite(id, action);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Əməliyyat alınmadı");
    } finally {
      setBusyId(null);
    }
  };

  if (!user) {
    return (
      <div className="bg-[#08080e] min-h-screen pt-24 text-center">
        <p className="text-white/50 mb-4">Daxil olun</p>
        <Button onClick={() => navigate("/login")}>Giriş</Button>
      </div>
    );
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-24 pb-20">
      <div className="max-w-[700px] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-5xl font-bold text-white">
            Bildirişlər
          </h1>
          <p className="text-white/45 text-sm mt-1">
            Liqa dəvətləri və digər sorğular
          </p>
        </div>

        {loading ? (
          <p className="text-white/40 text-center py-12">Yüklənir...</p>
        ) : error ? (
          <p className="text-rose-400 text-center py-12">{error}</p>
        ) : invites.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#101017] p-10 text-center">
            <Bell className="mx-auto mb-3 text-white/25" size={28} />
            <p className="text-white/45">Gözləyən dəvət yoxdur</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-2xl border border-[#c5f135]/20 bg-[#101017] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-[#c5f135]/15 p-2 text-[#c5f135]">
                    <Trophy size={16} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">Liqa dəvəti</h3>
                    <p className="text-sm text-white/55 mt-1">
                      <span className="text-white">{invite.league.name}</span>{" "}
                      liqası{" "}
                      <span className="text-white">{invite.team.name}</span>{" "}
                      komandanızı dəvət etdi
                      {invite.league.visibility === "PRIVATE"
                        ? " (özəl liqa)"
                        : " (ictimai liqa)"}
                      .
                    </p>
                    {invite.message ? (
                      <p className="text-xs text-white/35 mt-2 italic">
                        “{invite.message}”
                      </p>
                    ) : null}
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        disabled={busyId === invite.id}
                        onClick={() => void respond(invite.id, "accept")}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check size={14} />
                        Qəbul et
                      </button>
                      <button
                        type="button"
                        disabled={busyId === invite.id}
                        onClick={() => void respond(invite.id, "reject")}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        <X size={14} />
                        Rədd et
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
