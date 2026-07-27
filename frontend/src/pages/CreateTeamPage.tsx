import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Upload } from "lucide-react";
import { Button, Input } from "../components/ui";
import { createTeam } from "../api/teams";
import { useAuth } from "../context/AuthContext";

export default function CreateTeamPage({
  onClose,
}: { onClose?: () => void } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    city: "",
    description: "",
    shortName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!form.name.trim()) {
      setError("Komanda adı mütləqdir");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const team = await createTeam({
        name: form.name.trim(),
        city: form.city.trim() || undefined,
        description: form.description.trim() || undefined,
        shortName: form.shortName.trim() || undefined,
      });
      setCreatedId(team.id);
      setTimeout(() => navigate(`/teams/${team.id}`), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Komanda yaradılmadı");
    } finally {
      setSubmitting(false);
    }
  };

  if (createdId) {
    return (
      <div className="bg-[#08080e] min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#c5f135]/10 border border-[#c5f135]/30 flex items-center justify-center text-4xl mx-auto mb-6 animate-pulse">
            ✓
          </div>
          <h2 className="font-display text-4xl font-bold text-white mb-2">
            Komanda yaradıldı!
          </h2>
          <p className="text-white/50">
            Siz komanda kapitanısınız. İdarəetmə səhifəsinə keçirilirsiniz...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-24 pb-20">
      <div className="max-w-[700px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-5xl font-bold text-white">
              Komanda Yarat
            </h1>
            <p className="text-white/45 text-sm mt-1">
              Unikal ad seçin — siz avtomatik kapitan olursunuz
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="bg-[#101017] card-border rounded-3xl p-8 space-y-6">
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Komanda loqosu
            </label>
            <div className="w-20 h-20 rounded-2xl bg-[#18181f] border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-white/30">
              <Upload size={18} />
              <span className="text-[10px] text-white/25 mt-1">Tezliklə</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Komanda adı *"
              placeholder="Bakı Strikerlər"
              value={form.name}
              onChange={(v) => update("name", v)}
            />
            <Input
              label="Şəhər"
              placeholder="Bakı"
              value={form.city}
              onChange={(v) => update("city", v)}
            />
          </div>

          <Input
            label="Qısa ad"
            placeholder="BS"
            value={form.shortName}
            onChange={(v) => update("shortName", v)}
          />

          <Input
            label="Təsvir"
            placeholder="Komanda haqqında qısa məlumat"
            value={form.description}
            onChange={(v) => update("description", v)}
          />

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "Yaradılır..." : "Komanda yarat"}
          </Button>
        </div>
      </div>
    </div>
  );
}
